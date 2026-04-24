import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHEET_NAME = 'BOOKED CLIENTS DELIVERABLES';

const HEADERS = [
  'Client Name', 'Event Date (AD)', 'Event Name',
  'All Photos', 'Selected Photos', 'Selected Photos Crew', 'Insta Posts - Photos',
  'Full Video', 'Full Video Qty', 'Full Video Names',
  'Highlights', 'Highlights Qty', 'Highlights Names',
  'Reel', 'Insta Posts - Video',
  'Overall Highlights', 'Overall Reels',
  'Album Bride', 'Album Bride Type', 'Album Groom', 'Album Groom Type',
  'Album Other', 'Album Other Name & Type',
  'Pendrive Qty', 'Frame Qty',
  'Registered DateTime AD',
];

// --- Google Auth ---
async function getAccessToken(): Promise<string> {
  const clientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL')!;
  const privateKeyRaw = Deno.env.get('GOOGLE_PRIVATE_KEY')!;
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const claim = btoa(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }));

  const encoder = new TextEncoder();
  const keyData = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );

  const signatureInput = encoder.encode(`${header}.${claim}`);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, signatureInput);
  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${header}.${claim}.${sig}`;
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await tokenResp.json();
  return tokenData.access_token;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const resp = await fetch(url, options);
    if (resp.status === 429 && attempt < retries) {
      await new Promise(r => setTimeout(r, Math.pow(2, attempt + 1) * 1000));
      continue;
    }
    return resp;
  }
  throw new Error('Max retries exceeded');
}

async function ensureSheet(spreadsheetId: string, accessToken: string): Promise<void> {
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const metaResp = await fetchWithRetry(metaUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  const meta = await metaResp.json();
  const exists = (meta.sheets || []).some((s: any) => s.properties?.title === SHEET_NAME);

  if (!exists) {
    await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: SHEET_NAME } } }] }),
    });
    const headerRange = encodeURIComponent(`'${SHEET_NAME}'!A1:Z1`);
    await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${headerRange}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [HEADERS] }),
    });
    console.log(`[sync-deliverables] Created sheet "${SHEET_NAME}" with headers`);
  }
}

// --- Helpers ---
function yn(val: boolean): string { return val ? 'YES' : 'NO'; }

function formatItemNames(raw: string): string {
  if (!raw) return '';
  return raw.replace(/\|\|\|/g, ', ');
}

function parseCrewString(togglesJson: string): string {
  try {
    const obj = JSON.parse(togglesJson);
    return Object.entries(obj)
      .filter(([_, v]) => v === true)
      .map(([k]) => k)
      .join(', ');
  } catch { return togglesJson || ''; }
}

// Global section/event names that are NOT real events
const GLOBAL_SECTIONS = ['OVERALL', 'ALBUM', 'PHYSICAL'];

interface DbRow {
  registered_date_time_ad: string;
  event_name: string;
  section: string;
  deliverable_type: string;
  enabled: boolean;
  quantity: number;
  item_names: string;
  album_name: string;
  photographer_toggles: string;
  photographer_notes: string;
}

function buildSheetRows(
  allRows: DbRow[],
  clientName: string,
  regId: string,
  eventDateMap: Map<string, string>, // eventName -> event_date_ad
): string[][] {
  // Separate real event rows vs global rows
  const eventRows = allRows.filter(r => !GLOBAL_SECTIONS.includes(r.event_name));
  const globalRows = allRows.filter(r => GLOBAL_SECTIONS.includes(r.event_name));

  // Group event rows by event_name
  const eventGroups = new Map<string, DbRow[]>();
  for (const r of eventRows) {
    if (!eventGroups.has(r.event_name)) eventGroups.set(r.event_name, []);
    eventGroups.get(r.event_name)!.push(r);
  }

  // Helper to find a deliverable
  const findGlobal = (section: string, type: string) =>
    globalRows.find(r => r.section === section && r.deliverable_type === type);

  // Global items (only on first row)
  const overallHighlights = findGlobal('overall', 'overall_highlights');
  const overallReels = findGlobal('overall', 'overall_reel');
  const brideAlbum = findGlobal('album', 'bride_album');
  const groomAlbum = findGlobal('album', 'groom_album');
  const otherAlbum = findGlobal('album', 'other_album');
  const pendrive = findGlobal('physical', 'pendrive');
  const frame = findGlobal('physical', 'frame');

  const result: string[][] = [];
  let isFirst = true;

  for (const [eventName, rows] of eventGroups) {
    const get = (section: string, type: string) =>
      rows.find(r => r.section === section && r.deliverable_type === type);

    const allPhotos = get('photos', 'all_photos');
    const selectedPhotos = get('photos', 'selected_photos');
    const instaPhotos = get('photos', 'insta_post');
    const fullVideo = get('videos', 'full_video');
    const highlights = get('videos', 'highlights');
    const reel = get('videos', 'reel');
    const instaVideo = get('videos', 'video_insta_post');

    const eventDate = eventDateMap.get(eventName) || '';

    const row: string[] = [
      clientName,
      eventDate,
      eventName,
      yn(allPhotos?.enabled ?? false),
      yn(selectedPhotos?.enabled ?? false),
      selectedPhotos ? parseCrewString(selectedPhotos.photographer_toggles) : '',
      yn(instaPhotos?.enabled ?? false),
      yn(fullVideo?.enabled ?? false),
      String(fullVideo?.quantity ?? 1),
      formatItemNames(fullVideo?.item_names || ''),
      yn(highlights?.enabled ?? false),
      String(highlights?.quantity ?? 1),
      formatItemNames(highlights?.item_names || ''),
      yn(reel?.enabled ?? false),
      yn(instaVideo?.enabled ?? false),
      // Global columns — only on first row
      isFirst ? yn(overallHighlights?.enabled ?? false) : '',
      isFirst ? yn(overallReels?.enabled ?? false) : '',
      isFirst ? yn(brideAlbum?.enabled ?? false) : '',
      isFirst ? (brideAlbum?.album_name || '') : '',
      isFirst ? yn(groomAlbum?.enabled ?? false) : '',
      isFirst ? (groomAlbum?.album_name || '') : '',
      isFirst ? yn(otherAlbum?.enabled ?? false) : '',
      isFirst ? (otherAlbum?.album_name || '') : '',
      isFirst ? String(pendrive?.quantity ?? 0) : '',
      isFirst ? String(frame?.quantity ?? 0) : '',
      regId,
    ];

    result.push(row);
    isFirst = false;
  }

  // If client has NO real events but has global items, still output one row
  if (result.length === 0 && globalRows.length > 0) {
    result.push([
      clientName, '', '',
      '', '', '', '',
      '', '', '',
      '', '', '',
      '', '',
      yn(overallHighlights?.enabled ?? false),
      yn(overallReels?.enabled ?? false),
      yn(brideAlbum?.enabled ?? false),
      brideAlbum?.album_name || '',
      yn(groomAlbum?.enabled ?? false),
      groomAlbum?.album_name || '',
      yn(otherAlbum?.enabled ?? false),
      otherAlbum?.album_name || '',
      String(pendrive?.quantity ?? 0),
      String(frame?.quantity ?? 0),
      regId,
    ]);
  }

  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action || 'push';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID')!;
    const accessToken = await getAccessToken();

    await ensureSheet(spreadsheetId, accessToken);

    // Helper: load event dates for a set of regIds
    async function loadEventDateMap(regIds: string[]): Promise<Map<string, Map<string, string>>> {
      // Returns: regId -> (eventName -> eventDateAD)
      const result = new Map<string, Map<string, string>>();
      if (regIds.length === 0) return result;

      const { data: eventDetails } = await supabase
        .from('event_details_cache')
        .select('registered_date_time_ad, event_name, event_date_ad')
        .in('registered_date_time_ad', regIds);

      for (const ed of eventDetails || []) {
        if (!result.has(ed.registered_date_time_ad)) result.set(ed.registered_date_time_ad, new Map());
        if (ed.event_name && ed.event_date_ad) {
          result.get(ed.registered_date_time_ad)!.set(ed.event_name, ed.event_date_ad);
        }
      }
      return result;
    }

    // Helper: load client names
    async function loadClientNames(regIds: string[]): Promise<Map<string, string>> {
      const map = new Map<string, string>();
      if (regIds.length === 0) return map;
      const { data: clients } = await supabase
        .from('clients_cache')
        .select('registered_date_time_ad, client_name')
        .in('registered_date_time_ad', regIds);
      for (const c of clients || []) {
        map.set(c.registered_date_time_ad, c.client_name || '');
      }
      return map;
    }

    if (action === 'fullSync') {
      const { data: allRows, error } = await supabase
        .from('client_deliverables')
        .select('*');
      if (error) throw error;

      const regIds = [...new Set((allRows || []).map((r: any) => r.registered_date_time_ad))];
      const clientNameMap = await loadClientNames(regIds);
      const eventDateMaps = await loadEventDateMap(regIds);

      // Group all rows by regId
      const byClient = new Map<string, DbRow[]>();
      for (const row of allRows || []) {
        if (!byClient.has(row.registered_date_time_ad)) byClient.set(row.registered_date_time_ad, []);
        byClient.get(row.registered_date_time_ad)!.push(row as DbRow);
      }

      const sheetRows: string[][] = [];
      for (const [regId, rows] of byClient) {
        const name = clientNameMap.get(regId) || '';
        const edMap = eventDateMaps.get(regId) || new Map();
        sheetRows.push(...buildSheetRows(rows, name, regId, edMap));
      }

      // Clear and rewrite
      const clearRange = encodeURIComponent(`'${SHEET_NAME}'!A2:Z50000`);
      await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });

      if (sheetRows.length > 0) {
        const writeRange = encodeURIComponent(`'${SHEET_NAME}'!A2:Z${sheetRows.length + 1}`);
        await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: sheetRows }),
        });
      }

      await supabase
        .from('client_deliverables')
        .update({ synced_to_sheet: true } as any)
        .eq('synced_to_sheet', false);

      console.log(`[sync-deliverables] Full sync: wrote ${sheetRows.length} rows`);
      return new Response(JSON.stringify({ success: true, syncedCount: sheetRows.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- PUSH (incremental) ---
    const { data: unsyncedRows, error: fetchErr } = await supabase
      .from('client_deliverables')
      .select('*')
      .eq('synced_to_sheet', false);

    if (fetchErr) throw fetchErr;
    if (!unsyncedRows || unsyncedRows.length === 0) {
      return new Response(JSON.stringify({ success: true, syncedCount: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const unsyncedRegIds = [...new Set(unsyncedRows.map((r: any) => r.registered_date_time_ad))];

    // Load ALL deliverables for affected clients
    const { data: allClientDeliverables } = await supabase
      .from('client_deliverables')
      .select('*')
      .in('registered_date_time_ad', unsyncedRegIds);

    const clientNameMap = await loadClientNames(unsyncedRegIds);
    const eventDateMaps = await loadEventDateMap(unsyncedRegIds);

    // Group by regId
    const byClient = new Map<string, DbRow[]>();
    for (const row of allClientDeliverables || []) {
      if (!byClient.has(row.registered_date_time_ad)) byClient.set(row.registered_date_time_ad, []);
      byClient.get(row.registered_date_time_ad)!.push(row as DbRow);
    }

    // Read existing sheet to find matching rows
    const readRange = encodeURIComponent(`'${SHEET_NAME}'!A2:Z50000`);
    const readResp = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${readRange}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const readData = await readResp.json();
    const existingRows: string[][] = readData.values || [];

    // Index existing rows by "regId|||eventName" -> sheet row number (1-indexed from row 2)
    const sheetIndex = new Map<string, number>();
    existingRows.forEach((r, idx) => {
      const regId = (r[25] || '').trim(); // Column Z
      const eventName = (r[2] || '').trim(); // Column C
      if (regId) sheetIndex.set(`${regId}|||${eventName}`, idx + 2); // +2 for header + 1-index
    });

    const batchUpdates: { range: string; values: string[][] }[] = [];
    const appendRows: string[][] = [];

    for (const [regId, rows] of byClient) {
      const name = clientNameMap.get(regId) || '';
      const edMap = eventDateMaps.get(regId) || new Map();
      const newRows = buildSheetRows(rows, name, regId, edMap);

      // First, find all existing sheet rows for this regId and delete-by-overwrite
      // Then place the new rows
      for (const newRow of newRows) {
        const eventName = newRow[2] || '';
        const key = `${regId}|||${eventName}`;
        const existingSheetRow = sheetIndex.get(key);
        if (existingSheetRow !== undefined) {
          batchUpdates.push({
            range: `'${SHEET_NAME}'!A${existingSheetRow}:Z${existingSheetRow}`,
            values: [newRow],
          });
        } else {
          appendRows.push(newRow);
        }
      }
    }

    if (batchUpdates.length > 0) {
      await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: batchUpdates }),
      });
    }

    if (appendRows.length > 0) {
      const appendRange = encodeURIComponent(`'${SHEET_NAME}'!A:Z`);
      await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: appendRows }),
      });
    }

    const unsyncedIds = unsyncedRows.map((r: any) => r.id);
    await supabase
      .from('client_deliverables')
      .update({ synced_to_sheet: true } as any)
      .in('id', unsyncedIds);

    const totalSynced = batchUpdates.length + appendRows.length;
    console.log(`[sync-deliverables] Push: updated ${batchUpdates.length}, appended ${appendRows.length}`);
    return new Response(JSON.stringify({ success: true, syncedCount: totalSynced, updated: batchUpdates.length, appended: appendRows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[sync-deliverables] Error:', error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
