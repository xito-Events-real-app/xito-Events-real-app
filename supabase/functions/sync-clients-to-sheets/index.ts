import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Auth (same as sync-crew-to-sheets)
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
      console.log(`[sync-clients] Rate limited, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    return resp;
  }
  throw new Error('Max retries exceeded');
}

// Column mapping: sheet index -> DB column name
// A=0, B=1, ... AL=37
const COL_NAMES = [
  'registered_date_time_ad',  // A=0
  'registered_date_bs',       // B=1
  'client_name',              // C=2
  'source',                   // D=3
  'client_location',          // E=4
  'current_country',          // F=5
  'contact_no',               // G=6
  'whatsapp_no',              // H=7
  'email',                    // I=8
  'event_location',           // J=9
  'event_city',               // K=10
  'events',                   // L=11
  'event_year',               // M=12
  'event_month',              // N=13
  'event_day',                // O=14
  'event_date_ad',            // P=15
  'who_added',                // Q=16
  'inquiry_date_ad',          // R=17
  'inquiry_date_bs',          // S=18
  'inquiry_time',             // T=19
  'description',              // U=20
  'quotation_data',           // V=21
  'status_log',               // W=22
  'client_handler',           // X=23
  'call_log',                 // Y=24
  'mindset',                  // Z=25
  'our_bargained_rates',      // AA=26
  'client_bargained_rates',   // AB=27
  'comments',                 // AC=28
  'final_quotation',          // AD=29
  'payments_made',            // AE=30
  'payment_dates_ad',         // AF=31
  'remaining_payment',        // AG=32
  'company_name',             // AH=33
  'service_types',            // AI=34
  'last_activity_log',        // AJ=35
  'priority',                 // AK=36
  'benzo_keep_notes',         // AL=37
];

function parseSheetRow(row: string[], rowIndex: number, sheetSource: 'tracker' | 'booked'): Record<string, any> | null {
  const regId = (row[0] || '').trim();
  if (!regId) return null;

  const record: Record<string, any> = {
    sheet_source: sheetSource,
    row_number: rowIndex + 2, // +2 because row 1 is header, array is 0-indexed
    synced_to_sheet: true,
    updated_at: new Date().toISOString(),
  };

  for (let i = 0; i < COL_NAMES.length; i++) {
    record[COL_NAMES[i]] = (row[i] || '').trim();
  }

  return record;
}

// Convert DB row back to sheet row array (columns A-AL)
function dbRowToSheetArray(row: Record<string, any>): string[] {
  return COL_NAMES.map(col => row[col] || '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body.action || 'push';

    if (action === 'pull') {
      // DISABLED: Supabase is the absolute source of truth. Sheets are only a mirror.
      console.log('[sync-clients] Pull action is disabled. Supabase is source of truth.');
      return new Response(JSON.stringify({ success: true, message: 'Pull from sheets disabled. Supabase is source of truth.', count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'push') {
      // Push unsynced rows back to Google Sheets
      const { data: unsyncedRows, error: fetchError } = await supabase
        .from('clients_cache')
        .select('*')
        .eq('synced_to_sheet', false);

      if (fetchError) throw fetchError;
      if (!unsyncedRows || unsyncedRows.length === 0) {
        return new Response(JSON.stringify({ success: true, syncedCount: 0 }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const accessToken = await getAccessToken();
      const batchData: { range: string; values: string[][] }[] = [];
      const syncedIds: string[] = [];
      const appendRows: any[] = [];

      for (const row of unsyncedRows) {
        const sheetName = row.sheet_source === 'booked' ? 'BOOKED CLIENTS' : 'CLIENT TRACKER';
        const rowNum = row.row_number;

        // Skip booked-migrating rows (handled by MOVE logic in updateClientStatus)
        if (row.sheet_source === 'booked' && (!rowNum || rowNum < 2)) {
          console.log(`[sync-clients] Skipping booked-migrating client ${row.client_name} (handled by MOVE logic)`);
          continue;
        }

        if (!rowNum || rowNum < 2) {
          // Tracker clients with invalid row — needs append
          appendRows.push(row);
          continue;
        }

        const sheetArray = dbRowToSheetArray(row);
        batchData.push({
          range: `'${sheetName}'!A${rowNum}:AL${rowNum}`,
          values: [sheetArray],
        });

        syncedIds.push(row.registered_date_time_ad);
      }

      // Batch update to Google Sheets
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

      // Append clients with invalid row numbers (newly added) — grouped by sheet
      if (appendRows.length > 0) {
        const groupedBySheet: Record<string, any[]> = {};
        for (const row of appendRows) {
          const sheetName = row.sheet_source === 'booked' ? 'BOOKED CLIENTS' : 'CLIENT TRACKER';
          if (!groupedBySheet[sheetName]) groupedBySheet[sheetName] = [];
          groupedBySheet[sheetName].push(row);
        }

        for (const [sheetName, rows] of Object.entries(groupedBySheet)) {
          // Use APPEND API to add rows after the last row (handles gaps correctly)
          const appendApiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${sheetName}'!A:AL`)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

          for (const row of rows) {
            const sheetArray = dbRowToSheetArray(row);
            const appendResp = await fetchWithRetry(appendApiUrl, {
              method: 'POST',
              headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ values: [sheetArray] }),
            });

            if (!appendResp.ok) {
              const errText = await appendResp.text();
              console.error(`[sync-clients] Failed to append ${row.registered_date_time_ad} to '${sheetName}': ${appendResp.status} - ${errText.substring(0, 200)}`);
              continue; // Skip this row, don't mark as synced
            }

            // Parse the response to get the actual row number where data was written
            const appendResult = await appendResp.json();
            const updatedRange = appendResult.updates?.updatedRange || '';
            // Extract row number from range like "'CLIENT TRACKER'!A95:AL95"
            const rowMatch = updatedRange.match(/!A(\d+):/);
            const actualRow = rowMatch ? parseInt(rowMatch[1], 10) : 0;

            // Update DB with correct row number but keep synced_to_sheet = false
            // so the NEXT pull will confirm it exists and set it to true
            await supabase
              .from('clients_cache')
              .update({ row_number: actualRow || 0, synced_to_sheet: false, updated_at: new Date().toISOString() } as any)
              .eq('registered_date_time_ad', row.registered_date_time_ad);

            console.log(`[sync-clients] Appended ${row.sheet_source} client ${row.registered_date_time_ad} to '${sheetName}' at row ${actualRow} (kept unsynced for pull verification)`);
            // Do NOT add to syncedIds — let the next pull confirm
          }
        }
      }

      // Mark as synced
      if (syncedIds.length > 0) {
        for (const id of syncedIds) {
          await supabase
            .from('clients_cache')
            .update({ synced_to_sheet: true, updated_at: new Date().toISOString() } as any)
            .eq('registered_date_time_ad', id);
        }
      }

      console.log(`[sync-clients] Pushed ${syncedIds.length} rows to Google Sheets`);
      return new Response(JSON.stringify({ success: true, syncedCount: syncedIds.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[sync-clients] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
