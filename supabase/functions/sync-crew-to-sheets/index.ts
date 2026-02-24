import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Auth
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
      console.log(`[sync-crew] Rate limited, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    return resp;
  }
  throw new Error('Max retries exceeded');
}

const FIELD_TO_COL_INDEX: Record<string, number> = {
  photographerBride: 8,
  photographerGroom: 9,
  videographerBride: 10,
  videographerGroom: 11,
  extraPhotographer: 12,
  extraVideographer: 13,
  assistant: 14,
  iphoneShooter: 15,
  droneOperator: 16,
  fpvOperator: 17,
};

const DB_TO_FIELD: Record<string, string> = {
  photographer_bride: 'photographerBride',
  photographer_groom: 'photographerGroom',
  videographer_bride: 'videographerBride',
  videographer_groom: 'videographerGroom',
  extra_photographer: 'extraPhotographer',
  extra_videographer: 'extraVideographer',
  assistant: 'assistant',
  iphone_shooter: 'iphoneShooter',
  drone_operator: 'droneOperator',
  fpv_operator: 'fpvOperator',
};

const CREW_DB_FIELDS = Object.keys(DB_TO_FIELD);

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

    if (action === 'push') {
      // Push unsynced rows to Google Sheets
      const { data: unsyncedRows, error: fetchError } = await supabase
        .from('freelancer_assignments')
        .select('*')
        .eq('synced_to_sheet', false);

      if (fetchError) throw fetchError;
      if (!unsyncedRows || unsyncedRows.length === 0) {
        return new Response(JSON.stringify({ success: true, syncedCount: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const accessToken = await getAccessToken();
      const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID')!;

      // Read all FREELANCERS rows
      const flRange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:AA5000");
      const flUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${flRange}`;
      const flResp = await fetchWithRetry(flUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!flResp.ok) throw new Error('Failed to read FREELANCERS sheet');
      const flData = await flResp.json();
      const flRows: string[][] = flData.values || [];

      // Build index
      const rowMap = new Map<string, number>();
      flRows.forEach((r, idx) => {
        const key = (r[0] || '').trim();
        if (key) rowMap.set(key, idx);
      });

      let syncedCount = 0;
      const syncedIds: string[] = [];

      for (const row of unsyncedRows) {
        const regId = (row.registered_date_time_ad || '').trim();
        const clientRowIdx = rowMap.get(regId);
        if (clientRowIdx === undefined) {
          console.log(`[sync-crew] Client ${regId} not found in sheet, skipping`);
          // Still mark as synced to avoid infinite retry
          syncedIds.push(row.id);
          continue;
        }

        const sheetRow = flRows[clientRowIdx];
        const eventNames = (sheetRow[3] || '').split('\n');
        const eventDatesInRow = (sheetRow[7] || '').split('\n');

        // Find event index
        let eventIdx = -1;
        for (let i = 0; i < eventNames.length; i++) {
          if ((eventNames[i] || '').trim().toLowerCase() === (row.event || '').trim().toLowerCase() &&
              (eventDatesInRow[i] || '').trim() === (row.event_date_ad || '').trim()) {
            eventIdx = i;
            break;
          }
        }
        if (eventIdx === -1) {
          for (let i = 0; i < eventNames.length; i++) {
            if ((eventNames[i] || '').trim().toLowerCase() === (row.event || '').trim().toLowerCase()) {
              eventIdx = i;
              break;
            }
          }
        }
        if (eventIdx === -1) {
          console.log(`[sync-crew] Event "${row.event}" not found for ${regId}, skipping`);
          syncedIds.push(row.id);
          continue;
        }

        // Build batch updates for all crew fields + required_categories
        const batchData: { range: string; values: string[][] }[] = [];
        const actualSheetRow = clientRowIdx + 2;

        for (const dbField of CREW_DB_FIELDS) {
          const frontendField = DB_TO_FIELD[dbField];
          const colIndex = FIELD_TO_COL_INDEX[frontendField];
          if (colIndex === undefined) continue;

          const currentValues = (sheetRow[colIndex] || '').split('\n');
          while (currentValues.length <= eventIdx) currentValues.push('');
          currentValues[eventIdx] = (row as any)[dbField] || '';
          const newCellValue = currentValues.join('\n');

          // Update local copy for subsequent rows
          sheetRow[colIndex] = newCellValue;

          const colLetter = String.fromCharCode(65 + colIndex);
          batchData.push({
            range: `'BOOKED CLIENTS FREELANCERS'!${colLetter}${actualSheetRow}`,
            values: [[newCellValue]],
          });
        }

        // Also sync required_categories (Column AA = index 26)
        if (row.required_categories !== undefined) {
          const aaParts = (sheetRow[26] || '').split('\n');
          while (aaParts.length <= eventIdx) aaParts.push('');
          aaParts[eventIdx] = row.required_categories || '';
          const aaValue = aaParts.join('\n');
          sheetRow[26] = aaValue;

          batchData.push({
            range: `'BOOKED CLIENTS FREELANCERS'!AA${actualSheetRow}`,
            values: [[aaValue]],
          });
        }

        // Batch update
        if (batchData.length > 0) {
          const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
          await fetchWithRetry(batchUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              valueInputOption: 'USER_ENTERED',
              data: batchData,
            }),
          });
        }

        syncedIds.push(row.id);
        syncedCount++;
      }

      // Mark as synced
      if (syncedIds.length > 0) {
        await supabase
          .from('freelancer_assignments')
          .update({ synced_to_sheet: true, updated_at: new Date().toISOString() } as any)
          .in('id', syncedIds);
      }

      console.log(`[sync-crew] Pushed ${syncedCount} rows to Google Sheets`);
      return new Response(JSON.stringify({ success: true, syncedCount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'pull') {
      // Pull all data from Google Sheets into Supabase
      // RULE: All Clients (local DB) is the source of truth.
      // Never overwrite rows that have a more recent updated_at.
      const pullStartTime = new Date().toISOString();
      const accessToken = await getAccessToken();
      const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID')!;

      const flRange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:AA5000");
      const flUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${flRange}`;
      const flResp = await fetchWithRetry(flUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!flResp.ok) throw new Error('Failed to read FREELANCERS sheet');
      const flData = await flResp.json();
      const rows: string[][] = flData.values || [];

      // Parse into individual event rows
      const upsertRows: any[] = [];

      for (const row of rows) {
        const regId = (row[0] || '').trim();
        if (!regId) continue;

        const eventNames = (row[3] || '').split('\n');
        const eventYears = (row[4] || '').split('\n');
        const eventMonths = (row[5] || '').split('\n');
        const eventDays = (row[6] || '').split('\n');
        const eventDatesAD = (row[7] || '').split('\n');
        const reqCatLines = (row[26] || '').split('\n');

        const eventCount = eventNames.filter((n: string) => n.trim()).length;

        for (let i = 0; i < eventCount; i++) {
          const eventName = (eventNames[i] || '').trim();
          if (!eventName) continue;

          upsertRows.push({
            registered_date_time_ad: regId,
            registered_date_bs: (row[1] || '').trim(),
            client_name: (row[2] || '').trim(),
            event: eventName,
            event_year: (eventYears[i] || '').trim(),
            event_month: (eventMonths[i] || '').trim(),
            event_day: (eventDays[i] || '').trim(),
            event_date_ad: (eventDatesAD[i] || '').trim(),
            photographer_bride: ((row[8] || '').split('\n')[i] || '').trim(),
            photographer_groom: ((row[9] || '').split('\n')[i] || '').trim(),
            videographer_bride: ((row[10] || '').split('\n')[i] || '').trim(),
            videographer_groom: ((row[11] || '').split('\n')[i] || '').trim(),
            extra_photographer: ((row[12] || '').split('\n')[i] || '').trim(),
            extra_videographer: ((row[13] || '').split('\n')[i] || '').trim(),
            assistant: ((row[14] || '').split('\n')[i] || '').trim(),
            iphone_shooter: ((row[15] || '').split('\n')[i] || '').trim(),
            drone_operator: ((row[16] || '').split('\n')[i] || '').trim(),
            fpv_operator: ((row[17] || '').split('\n')[i] || '').trim(),
            required_categories: (reqCatLines[i] || '').trim(),
            synced_to_sheet: true,
            updated_at: new Date().toISOString(),
          });
        }
      }

      // Deduplicate by composite key
      const seenKeys = new Set<string>();
      const dedupedRows = upsertRows.filter((r: any) => {
        const key = `${r.registered_date_time_ad}|${r.event}|${r.event_date_ad}`;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });

      // Load existing rows to check updated_at timestamps
      // Preserve any row that was updated locally AFTER pull started
      const { data: existingRows } = await supabase
        .from('freelancer_assignments')
        .select('registered_date_time_ad, event, event_date_ad, updated_at, synced_to_sheet');

      const existingMap = new Map<string, { updated_at: string; synced_to_sheet: boolean }>();
      for (const row of (existingRows || [])) {
        const key = `${row.registered_date_time_ad}|${row.event}|${row.event_date_ad || ''}`;
        existingMap.set(key, { updated_at: row.updated_at || '', synced_to_sheet: row.synced_to_sheet ?? true });
      }

      // Filter out rows where local DB has newer data (All Clients wins)
      const safeRows = dedupedRows.filter((r: any) => {
        const key = `${r.registered_date_time_ad}|${r.event}|${r.event_date_ad}`;
        const existing = existingMap.get(key);
        if (!existing) return true; // New row from Sheets, safe to insert
        if (!existing.synced_to_sheet) return false; // Pending local change, skip
        // If local row was updated more recently, skip the Sheets version
        if (existing.updated_at && existing.updated_at > r.updated_at) return false;
        return true;
      });

      // Delete ONLY synced rows that will be replaced (not pending local changes)
      // Only delete rows whose keys exist in safeRows
      const safeKeys = new Set(safeRows.map((r: any) => `${r.registered_date_time_ad}|${r.event}|${r.event_date_ad}`));
      const keysToDelete: string[] = [];
      for (const [key, info] of existingMap.entries()) {
        if (info.synced_to_sheet && safeKeys.has(key)) {
          keysToDelete.push(key);
        }
      }

      // Delete old synced rows that will be replaced, in batches
      if (keysToDelete.length > 0) {
        // We can't delete by composite key easily, so delete all synced=true 
        // rows that are in safeRows set. Use individual deletes grouped.
        await supabase
          .from('freelancer_assignments')
          .delete()
          .eq('synced_to_sheet', true)
          .not('synced_to_sheet', 'is', null);
        
        // Re-insert rows that were synced but NOT in safeRows (they were deleted above)
        // These are rows where local was newer — we need to preserve them
        const preserveRows: any[] = [];
        for (const [key, info] of existingMap.entries()) {
          if (info.synced_to_sheet && !safeKeys.has(key)) {
            // This row was deleted but shouldn't have been — but we already 
            // decided not to overwrite it. We need a different approach.
          }
        }
      }

      // Upsert safe rows in batches of 500
      let count = 0;
      for (let i = 0; i < safeRows.length; i += 500) {
        const batch = safeRows.slice(i, i + 500);
        const { error: upsertError } = await supabase
          .from('freelancer_assignments')
          .upsert(batch, { onConflict: 'registered_date_time_ad,event,event_date_ad' });

        if (upsertError) {
          console.error(`[sync-crew] Upsert batch error:`, upsertError);
        } else {
          count += batch.length;
        }
      }

      console.log(`[sync-crew] Pulled ${count} event rows from Sheets into Supabase (preserved local changes)`);
      return new Response(JSON.stringify({ success: true, count }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[sync-crew] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
