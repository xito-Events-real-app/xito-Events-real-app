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
    const action = body.action || 'pull';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID')!;

    if (action === 'pull') {
      const accessToken = await getAccessToken();

      // Read both sheets in parallel
      const trackerRange = encodeURIComponent("'CLIENT TRACKER'!A2:AL5000");
      const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:AL5000");

      const [trackerResp, bookedResp] = await Promise.all([
        fetchWithRetry(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerRange}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ),
        fetchWithRetry(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        ),
      ]);

      if (!trackerResp.ok) throw new Error('Failed to read CLIENT TRACKER sheet');
      if (!bookedResp.ok) throw new Error('Failed to read BOOKED CLIENTS sheet');

      const trackerData = await trackerResp.json();
      const bookedData = await bookedResp.json();

      const trackerRows: string[][] = trackerData.values || [];
      const bookedRows: string[][] = bookedData.values || [];

      // Parse all rows
      const allRecords: Record<string, any>[] = [];

      for (let i = 0; i < trackerRows.length; i++) {
        const record = parseSheetRow(trackerRows[i], i, 'tracker');
        if (record) allRecords.push(record);
      }

      for (let i = 0; i < bookedRows.length; i++) {
        const record = parseSheetRow(bookedRows[i], i, 'booked');
        if (record) allRecords.push(record);
      }

      // Deduplicate by registered_date_time_ad (PK)
      // If same client exists in BOTH sheets, booked takes priority (source of truth)
      const recordMap = new Map<string, Record<string, any>>();
      for (const r of allRecords) {
        const key = r.registered_date_time_ad;
        const existing = recordMap.get(key);
        if (!existing || r.sheet_source === 'booked') {
          recordMap.set(key, r);
        }
      }
      const deduped = Array.from(recordMap.values());

      // Delete existing synced rows (preserve pending local changes)
      await supabase
        .from('clients_cache')
        .delete()
        .eq('synced_to_sheet', true);

      // Upsert in batches of 500
      let count = 0;
      for (let i = 0; i < deduped.length; i += 500) {
        const batch = deduped.slice(i, i + 500);
        const { error: upsertError } = await supabase
          .from('clients_cache')
          .upsert(batch as any, { onConflict: 'registered_date_time_ad' });

        if (upsertError) {
          console.error(`[sync-clients] Upsert batch error:`, upsertError);
        } else {
          count += batch.length;
        }
      }

      console.log(`[sync-clients] Pulled ${count} rows (${trackerRows.length} tracker + ${bookedRows.length} booked)`);
      return new Response(JSON.stringify({ success: true, count }), {
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

      for (const row of unsyncedRows) {
        const sheetName = row.sheet_source === 'booked' ? 'BOOKED CLIENTS' : 'CLIENT TRACKER';
        const rowNum = row.row_number;

        if (!rowNum || rowNum < 2) {
          console.log(`[sync-clients] Invalid row_number for ${row.registered_date_time_ad}, skipping`);
          syncedIds.push(row.registered_date_time_ad);
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
