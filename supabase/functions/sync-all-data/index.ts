import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Google Auth (same pattern as sync-clients-to-sheets)
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
      console.log(`[sync-all-data] Rate limited, retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      continue;
    }
    return resp;
  }
  throw new Error('Max retries exceeded');
}

async function fetchSheetData(accessToken: string, spreadsheetId: string, range: string): Promise<string[][]> {
  const encodedRange = encodeURIComponent(range);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`;
  const resp = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!resp.ok) {
    const errText = await resp.text();
    console.error(`[sync-all-data] Sheet read error for ${range}: ${resp.status} ${errText.substring(0, 200)}`);
    return [];
  }
  const data = await resp.json();
  return data.values || [];
}

// ============= PULL FREELANCERS =============
async function pullFreelancers(accessToken: string, supabase: any) {
  const flSpreadsheetId = Deno.env.get('WTN_FREELANCERS_SPREADSHEET_ID')!;
  const rows = await fetchSheetData(accessToken, flSpreadsheetId, "'FREELANCERS'!A2:S501");
  
  if (rows.length === 0) {
    console.log('[sync-all-data] No freelancer rows found');
    return 0;
  }

  const records = rows
    .map((row, index) => {
      const name = (row[0] || '').trim();
      if (!name) return null;
      return {
        row_number: index + 2,
        name,
        contact_no: row[1] || '',
        whatsapp_no: row[2] || '',
        instagram: row[3] || '',
        facebook: row[4] || '',
        city: row[5] || '',
        area: row[6] || '',
        map_link: row[7] || '',
        pathao_landmark: row[8] || '',
        main_job: row[9] || '',
        photographer: row[10] || 'NO',
        videographer: row[11] || 'NO',
        photo_editor: row[12] || 'NO',
        video_editor: row[13] || 'NO',
        hybrid_shooter: row[14] || 'NO',
        hybrid_editor: row[15] || 'NO',
        drone_operator: row[16] || 'NO',
        fpv_operator: row[17] || 'NO',
        iphone_shooter: row[18] || 'NO',
        synced_to_sheet: true,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  // Delete all synced rows, then upsert fresh data
  await supabase.from('freelancers_cache').delete().eq('synced_to_sheet', true);

  let count = 0;
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { error } = await supabase.from('freelancers_cache').upsert(batch, { onConflict: 'name' });
    if (error) {
      console.error('[sync-all-data] Freelancers upsert error:', error);
    } else {
      count += batch.length;
    }
  }

  console.log(`[sync-all-data] Pulled ${count} freelancers`);
  return count;
}

// ============= PULL VENDORS =============
async function pullVendors(accessToken: string, supabase: any) {
  const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID')!;
  const rows = await fetchSheetData(accessToken, spreadsheetId, "'VENDORS'!A2:R501");

  if (rows.length === 0) {
    console.log('[sync-all-data] No vendor rows found');
    return 0;
  }

  const records = rows
    .map((row, index) => {
      const vendorName = (row[0] || '').trim();
      if (!vendorName) return null;
      return {
        row_number: index + 2,
        vendor_name: vendorName,
        vendor_type: row[1] || '',
        company_contact_no: row[2] || '',
        owner1_name: row[3] || '',
        owner1_contact_no: row[4] || '',
        owner1_whatsapp_no: row[5] || '',
        owner2_name: row[6] || '',
        owner2_contact_no: row[7] || '',
        owner2_whatsapp_no: row[8] || '',
        city: row[9] || '',
        area: row[10] || '',
        google_map_link: row[11] || '',
        instagram_link: row[12] || '',
        facebook_link: row[13] || '',
        tiktok_link: row[14] || '',
        youtube_link: row[15] || '',
        website_link: row[16] || '',
        email: row[17] || '',
        synced_to_sheet: true,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  await supabase.from('vendors_cache').delete().eq('synced_to_sheet', true);

  let count = 0;
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { error } = await supabase.from('vendors_cache').insert(batch);
    if (error) {
      console.error('[sync-all-data] Vendors insert error:', error);
    } else {
      count += batch.length;
    }
  }

  console.log(`[sync-all-data] Pulled ${count} vendors`);
  return count;
}

// ============= PULL LOGISTICS (venue types + parlour types + their vendors) =============
async function pullLogistics(accessToken: string, supabase: any) {
  const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID')!;

  // Read venue types (Column A) and parlour types (Column C) from EVENT DETAILS SETUP DATA
  const setupRows = await fetchSheetData(accessToken, spreadsheetId, "'EVENT DETAILS SETUP DATA'!A2:C100");

  const venueTypes: string[] = [];
  const parlourTypes: string[] = [];

  for (const row of setupRows) {
    if (row[0]?.trim()) venueTypes.push(row[0].trim());
    if (row[2]?.trim()) parlourTypes.push(row[2].trim());
  }

  // Clear and re-insert types
  await supabase.from('logistics_types_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const typeRecords = [
    ...venueTypes.map(t => ({ category: 'venue', type_name: t, updated_at: new Date().toISOString() })),
    ...parlourTypes.map(t => ({ category: 'parlour', type_name: t, updated_at: new Date().toISOString() })),
  ];

  if (typeRecords.length > 0) {
    const { error } = await supabase.from('logistics_types_cache').insert(typeRecords);
    if (error) console.error('[sync-all-data] Logistics types insert error:', error);
  }

  // Now pull vendor data from each type-specific sheet
  await supabase.from('logistics_vendors_cache').delete().eq('synced_to_sheet', true);

  let totalVendors = 0;
  const allTypes = [
    ...venueTypes.map(t => ({ type: t, category: 'venue' })),
    ...parlourTypes.map(t => ({ type: t, category: 'parlour' })),
  ];

  for (const { type, category } of allTypes) {
    try {
      const sheetName = type.toUpperCase();
      const rows = await fetchSheetData(accessToken, spreadsheetId, `'${sheetName}'!A2:S500`);

      const vendorRecords = rows
        .map((row, index) => {
          const name = (row[0] || '').trim();
          if (!name) return null;
          return {
            row_number: index + 2,
            vendor_category: category,
            vendor_type: type,
            name,
            company_whatsapp: row[1] || '',
            company_contact: row[2] || '',
            owner1: row[3] || '',
            owner1_contact: row[4] || '',
            owner1_whatsapp: row[5] || '',
            owner2: row[6] || '',
            owner2_contact: row[7] || '',
            owner2_whatsapp: row[8] || '',
            city: row[9] || '',
            area: row[10] || '',
            google_map: row[11] || '',
            instagram: row[12] || '',
            facebook: row[13] || '',
            tiktok: row[14] || '',
            youtube: row[15] || '',
            website: row[16] || '',
            gmail: row[17] || '',
            rating: row[18] || '',
            synced_to_sheet: true,
            updated_at: new Date().toISOString(),
          };
        })
        .filter(Boolean);

      if (vendorRecords.length > 0) {
        const { error } = await supabase.from('logistics_vendors_cache').insert(vendorRecords);
        if (error) {
          console.error(`[sync-all-data] Logistics vendors insert error for ${type}:`, error);
        } else {
          totalVendors += vendorRecords.length;
        }
      }
    } catch (e) {
      console.warn(`[sync-all-data] Could not read sheet for type "${type}": ${e.message}`);
    }
  }

  console.log(`[sync-all-data] Pulled ${typeRecords.length} types, ${totalVendors} logistics vendors`);
  return { types: typeRecords.length, vendors: totalVendors };
}

// ============= PULL DROPDOWNS =============
async function pullDropdowns(accessToken: string, supabase: any) {
  const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID')!;

  // Read CLIENT TRACKER SETUP DATA (A2:X100) — same as getDropdowns in google-sheets edge function
  const setupRows = await fetchSheetData(accessToken, spreadsheetId, "'CLIENT TRACKER SETUP DATA'!A2:X100");

  const getColumn = (idx: number) => setupRows.map(row => row[idx]).filter(Boolean);

  const dropdowns: Record<string, string[]> = {
    sources: getColumn(0),           // A
    clientLocations: getColumn(1),   // B
    eventLocations: getColumn(2),    // C
    preweddingEvents: getColumn(3),  // D
    weddingEvents: getColumn(4),     // E
    postweddingEvents: getColumn(5), // F
    oldClients: getColumn(6),        // G
    whatsappOwners: getColumn(7),    // H
    clientStatuses: getColumn(8),    // I
    mindsetOptions: getColumn(10),   // K
    banks: getColumn(15),            // P
    paymentTypes: getColumn(16),     // Q
    relationOptions: getColumn(17),  // R
    companyNames: getColumn(22),     // W
    serviceTypes: getColumn(23),     // X
  };

  // Also read EVENT SETUP DATA (Column A) for allEvents
  const eventRows = await fetchSheetData(accessToken, spreadsheetId, "'EVENT SETUP DATA'!A2:A500");
  dropdowns.allEvents = eventRows.map(r => r[0]).filter(Boolean);

  // Upsert each category
  const now = new Date().toISOString();
  const records = Object.entries(dropdowns).map(([category, values]) => ({
    category,
    values_json: JSON.stringify(values),
    updated_at: now,
  }));

  for (const record of records) {
    const { error } = await supabase
      .from('dropdowns_cache')
      .upsert(record, { onConflict: 'category' });
    if (error) console.error(`[sync-all-data] Dropdown upsert error for ${record.category}:`, error);
  }

  console.log(`[sync-all-data] Pulled ${records.length} dropdown categories`);
  return records.length;
}

// ============= PULL CONTACT DETAILS =============
async function pullContactDetails(accessToken: string, supabase: any) {
  const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID')!;
  const rows = await fetchSheetData(accessToken, spreadsheetId, "'BOOKED CLIENTS CONTACT DETAILS'!A2:AB1000");

  if (rows.length === 0) {
    console.log('[sync-all-data] No contact details rows found');
    return 0;
  }

  const records = rows
    .map((row, index) => {
      const regId = (row[0] || '').trim();
      if (!regId) return null;
      return {
        registered_date_time_ad: regId,
        registered_date_bs: row[1] || '',
        client_name: row[2] || '',
        bride_full_name: row[3] || '',
        bride_contact_number: row[4] || '',
        bride_whatsapp_number: row[5] || '',
        bride_backup_number: row[6] || '',
        bride_backup_relation: row[7] || '',
        bride_backup_number2: row[8] || '',
        bride_backup_relation2: row[9] || '',
        bride_instagram: row[10] || '',
        bride_home_city: row[11] || '',
        bride_home_area: row[12] || '',
        bride_home_map: row[13] || '',
        bride_home_landmark: row[14] || '',
        groom_full_name: row[15] || '',
        groom_contact_number: row[16] || '',
        groom_whatsapp_number: row[17] || '',
        groom_backup_number: row[18] || '',
        groom_backup_relation: row[19] || '',
        groom_backup_number2: row[20] || '',
        groom_backup_relation2: row[21] || '',
        groom_instagram: row[22] || '',
        groom_home_city: row[23] || '',
        groom_home_area: row[24] || '',
        groom_home_map: row[25] || '',
        groom_home_landmark: row[26] || '',
        form_sent_date: row[27] || '',
        row_number: index + 2,
        synced_to_sheet: true,
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  await supabase.from('contact_details_cache').delete().eq('synced_to_sheet', true);

  let count = 0;
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { error } = await supabase
      .from('contact_details_cache')
      .upsert(batch, { onConflict: 'registered_date_time_ad' });
    if (error) {
      console.error('[sync-all-data] Contact details upsert error:', error);
    } else {
      count += batch.length;
    }
  }

  console.log(`[sync-all-data] Pulled ${count} contact details`);
  return count;
}

// ============= PULL EVENT DETAILS =============
async function pullEventDetails(accessToken: string, supabase: any) {
  const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID')!;
  const rows = await fetchSheetData(accessToken, spreadsheetId, "'BOOKED CLIENTS EVENT DETAILS'!A2:AH5000");

  if (rows.length === 0) {
    console.log('[sync-all-data] No event details rows found');
    return 0;
  }

  // Each row is ONE client with multi-line cells (newline-separated events)
  // We need to split by \n to create one record per event line
  const records: any[] = [];

  for (const row of rows) {
    const regId = (row[0] || '').trim();
    if (!regId) continue;

    // Parse multi-line columns (same as getClientEventDetails in google-sheets)
    const eventNames = (row[3] || '').split('\n');
    const eventYears = (row[4] || '').split('\n');
    const eventMonths = (row[5] || '').split('\n');
    const eventDays = (row[6] || '').split('\n');
    const eventDatesAD = (row[7] || '').split('\n');
    const venueTypes = (row[9] || '').split('\n');
    const venueNames = (row[10] || '').split('\n');
    const venueCities = (row[11] || '').split('\n');
    const venueAreas = (row[12] || '').split('\n');
    const venueMaps = (row[13] || '').split('\n');
    const eventStartTimes = (row[14] || '').split('\n');
    const eventEndTimes = (row[15] || '').split('\n');
    const parlourTypes = (row[16] || '').split('\n');
    const parlourNames = (row[17] || '').split('\n');
    const parlourCities = (row[18] || '').split('\n');
    const parlourAreas = (row[19] || '').split('\n');
    const parlourMaps = (row[20] || '').split('\n');
    const parlourStartTimes = (row[21] || '').split('\n');
    const parlourEndTimes = (row[22] || '').split('\n');
    const doGroomArr = (row[30] || '').split('\n');
    const guestCounts = (row[31] || '').split('\n');
    const eventDemands = (row[32] || '').split('\n');
    const eventReferences = (row[33] || '').split('\n');

    for (let ei = 0; ei < eventNames.length; ei++) {
      const name = (eventNames[ei] || '').trim();
      if (!name) continue;

      records.push({
        registered_date_time_ad: regId,
        event_index: ei,
        event_name: name,
        event_year: (eventYears[ei] || '').trim(),
        event_month: (eventMonths[ei] || '').trim(),
        event_day: (eventDays[ei] || '').trim(),
        event_date_ad: (eventDatesAD[ei] || '').trim(),
        venue_type: (venueTypes[ei] || '').trim(),
        venue_name: (venueNames[ei] || '').trim(),
        venue_city: (venueCities[ei] || '').trim(),
        venue_area: (venueAreas[ei] || '').trim(),
        venue_map: (venueMaps[ei] || '').trim(),
        event_start_time: (eventStartTimes[ei] || '').trim(),
        event_end_time: (eventEndTimes[ei] || '').trim(),
        parlour_type: (parlourTypes[ei] || '').trim(),
        parlour_name: (parlourNames[ei] || '').trim(),
        parlour_city: (parlourCities[ei] || '').trim(),
        parlour_area: (parlourAreas[ei] || '').trim(),
        parlour_map: (parlourMaps[ei] || '').trim(),
        parlour_start_time: (parlourStartTimes[ei] || '').trim(),
        parlour_end_time: (parlourEndTimes[ei] || '').trim(),
        do_groom_come_in_mehndi: (doGroomArr[ei] || '').trim(),
        guest_count: (guestCounts[ei] || '').trim(),
        event_demands: (eventDemands[ei] || '').trim(),
        event_references: (eventReferences[ei] || '').trim(),
        synced_to_sheet: true,
        updated_at: new Date().toISOString(),
      });
    }
  }

  await supabase.from('event_details_cache').delete().eq('synced_to_sheet', true);

  let count = 0;
  for (let i = 0; i < records.length; i += 200) {
    const batch = records.slice(i, i + 200);
    const { error } = await supabase.from('event_details_cache').insert(batch);
    if (error) {
      console.error('[sync-all-data] Event details insert error:', error);
    } else {
      count += batch.length;
    }
  }

  console.log(`[sync-all-data] Pulled ${count} event detail rows`);
  return count;
}

// ============= MAIN HANDLER =============
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const tables: string[] = body.tables || ['all'];
    const pullAll = tables.includes('all');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const accessToken = await getAccessToken();
    const results: Record<string, any> = {};

    if (pullAll || tables.includes('freelancers')) {
      results.freelancers = await pullFreelancers(accessToken, supabase);
    }

    if (pullAll || tables.includes('vendors')) {
      results.vendors = await pullVendors(accessToken, supabase);
    }

    if (pullAll || tables.includes('logistics')) {
      results.logistics = await pullLogistics(accessToken, supabase);
    }

    if (pullAll || tables.includes('dropdowns')) {
      results.dropdowns = await pullDropdowns(accessToken, supabase);
    }

    if (pullAll || tables.includes('contact_details')) {
      results.contactDetails = await pullContactDetails(accessToken, supabase);
    }

    if (pullAll || tables.includes('event_details')) {
      results.eventDetails = await pullEventDetails(accessToken, supabase);
    }

    console.log('[sync-all-data] Complete:', JSON.stringify(results));
    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[sync-all-data] Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200, // Return 200 to prevent UI crashes
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
