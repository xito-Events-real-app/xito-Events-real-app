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

// --- Google Auth (same pattern as sync-crew-to-sheets) ---
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
      const delay = Math.pow(2, attempt + 1) * 1000;
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    return resp;
  }
  throw new Error('Max retries exceeded');
}

// --- Ensure sheet tab exists ---
async function ensureSheet(spreadsheetId: string, accessToken: string): Promise<void> {
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const metaResp = await fetchWithRetry(metaUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  const meta = await metaResp.json();
  const exists = (meta.sheets || []).some((s: any) => s.properties?.title === SHEET_NAME);

  if (!exists) {
    // Create sheet
    await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      }),
    });
    // Write header row
    const headerRange = encodeURIComponent(`'${SHEET_NAME}'!A1:Z1`);
    await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${headerRange}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [HEADERS] }),
    });
    console.log(`[sync-deliverables] Created sheet "${SHEET_NAME}" with headers`);
  }
}

// --- Flatten deliverable rows into one sheet row per (client, event) ---
interface DeliverableRow {
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

function yn(val: boolean): string { return val ? 'YES' : 'NO'; }

function parseCrewString(togglesJson: string): string {
  try {
    const obj = JSON.parse(togglesJson);
    return Object.entries(obj)
      .filter(([_, v]) => v === true)
      .map(([k]) => k)
      .join(', ');
  } catch { return togglesJson || ''; }
}

function flattenGroup(rows: DeliverableRow[], clientName: string, eventDateAD: string): string[] {
  const get = (section: string, type: string): DeliverableRow | undefined =>
    rows.find(r => r.section === section && r.deliverable_type === type);

  const allPhotos = get('photos', 'all_photos');
  const selectedPhotos = get('photos', 'selected_photos');
  const instaPhotos = get('photos', 'insta_posts');
  const fullVideo = get('videos', 'full_video');
  const highlights = get('videos', 'highlights');
  const reel = get('videos', 'reel');
  const instaVideo = get('videos', 'insta_posts');
  const overallHighlights = get('overall', 'overall_highlights');
  const overallReels = get('overall', 'overall_reels');
  const albumBride = get('album', 'album_bride');
  const albumGroom = get('album', 'album_groom');
  const albumOther = get('album', 'album_other');
  const pendrive = get('physical', 'pendrive');
  const frame = get('physical', 'frame');

  const eventName = rows[0]?.event_name || '';
  const regId = rows[0]?.registered_date_time_ad || '';

  return [
    clientName,
    eventDateAD,
    eventName,
    yn(allPhotos?.enabled ?? false),
    yn(selectedPhotos?.enabled ?? false),
    selectedPhotos ? parseCrewString(selectedPhotos.photographer_toggles) : '',
    yn(instaPhotos?.enabled ?? false),
    yn(fullVideo?.enabled ?? false),
    String(fullVideo?.quantity ?? 1),
    fullVideo?.item_names || '',
    yn(highlights?.enabled ?? false),
    String(highlights?.quantity ?? 1),
    highlights?.item_names || '',
    yn(reel?.enabled ?? false),
    yn(instaVideo?.enabled ?? false),
    yn(overallHighlights?.enabled ?? false),
    yn(overallReels?.enabled ?? false),
    yn(albumBride?.enabled ?? false),
    albumBride?.album_name || '',
    yn(albumGroom?.enabled ?? false),
    albumGroom?.album_name || '',
    yn(albumOther?.enabled ?? false),
    albumOther ? `${albumOther.album_name}` : '',
    String(pendrive?.quantity ?? 0),
    String(frame?.quantity ?? 0),
    regId,
  ];
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

    if (action === 'fullSync') {
      // Read ALL deliverables
      const { data: allRows, error } = await supabase
        .from('client_deliverables')
        .select('*');
      if (error) throw error;

      // Look up client names
      const regIds = [...new Set((allRows || []).map((r: any) => r.registered_date_time_ad))];
      const clientMap = new Map<string, { name: string; eventDateAD: string }>();
      if (regIds.length > 0) {
        const { data: clients } = await supabase
          .from('clients_cache')
          .select('registered_date_time_ad, client_name, event_date_ad')
          .in('registered_date_time_ad', regIds);
        for (const c of clients || []) {
          clientMap.set(c.registered_date_time_ad, {
            name: c.client_name || '',
            eventDateAD: c.event_date_ad || '',
          });
        }
      }

      // Group by (regId, eventName)
      const groups = new Map<string, DeliverableRow[]>();
      for (const row of allRows || []) {
        const key = `${row.registered_date_time_ad}|||${row.event_name}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(row as DeliverableRow);
      }

      // Build sheet rows
      const sheetRows: string[][] = [];
      for (const [key, rows] of groups) {
        const regId = key.split('|||')[0];
        const info = clientMap.get(regId) || { name: '', eventDateAD: '' };
        sheetRows.push(flattenGroup(rows, info.name, info.eventDateAD));
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

      // Mark all synced
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

    // Get unique regIds from unsynced
    const unsyncedRegIds = [...new Set(unsyncedRows.map((r: any) => r.registered_date_time_ad))];

    // Load ALL deliverables for those clients (not just unsynced) to build complete rows
    const { data: allClientDeliverables } = await supabase
      .from('client_deliverables')
      .select('*')
      .in('registered_date_time_ad', unsyncedRegIds);

    // Look up client info
    const clientMap = new Map<string, { name: string; eventDateAD: string }>();
    const { data: clients } = await supabase
      .from('clients_cache')
      .select('registered_date_time_ad, client_name, event_date_ad')
      .in('registered_date_time_ad', unsyncedRegIds);
    for (const c of clients || []) {
      clientMap.set(c.registered_date_time_ad, {
        name: c.client_name || '',
        eventDateAD: c.event_date_ad || '',
      });
    }

    // Group by (regId, eventName)
    const groups = new Map<string, DeliverableRow[]>();
    for (const row of allClientDeliverables || []) {
      const key = `${row.registered_date_time_ad}|||${row.event_name}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row as DeliverableRow);
    }

    // Read existing sheet data to find rows by column Z (regId)
    const readRange = encodeURIComponent(`'${SHEET_NAME}'!A2:Z50000`);
    const readResp = await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${readRange}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const readData = await readResp.json();
    const existingRows: string[][] = readData.values || [];

    // Build index: "regId|||eventName" -> sheet row index (0-based from row 2)
    const sheetIndex = new Map<string, number>();
    existingRows.forEach((r, idx) => {
      const regId = (r[25] || '').trim(); // Column Z
      const eventName = (r[2] || '').trim(); // Column C
      if (regId) sheetIndex.set(`${regId}|||${eventName}`, idx);
    });

    const batchUpdates: { range: string; values: string[][] }[] = [];
    const appendRows: string[][] = [];

    for (const [key, rows] of groups) {
      const regId = key.split('|||')[0];
      const info = clientMap.get(regId) || { name: '', eventDateAD: '' };
      const flatRow = flattenGroup(rows, info.name, info.eventDateAD);

      const existingIdx = sheetIndex.get(key);
      if (existingIdx !== undefined) {
        const sheetRow = existingIdx + 2; // +2 for header + 0-index
        batchUpdates.push({
          range: `'${SHEET_NAME}'!A${sheetRow}:Z${sheetRow}`,
          values: [flatRow],
        });
      } else {
        appendRows.push(flatRow);
      }
    }

    // Batch update existing rows
    if (batchUpdates.length > 0) {
      await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ valueInputOption: 'USER_ENTERED', data: batchUpdates }),
      });
    }

    // Append new rows
    if (appendRows.length > 0) {
      const appendRange = encodeURIComponent(`'${SHEET_NAME}'!A:Z`);
      await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: appendRows }),
      });
    }

    // Mark all unsynced as synced
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
    console.error('[sync-deliverables] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
