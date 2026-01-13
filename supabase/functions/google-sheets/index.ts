// Google Sheets Edge Function for WTN Client Tracker
// Handles read/write operations with the Google Sheets API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

interface SheetRequest {
  action: 'getDropdowns' | 'getClients' | 'addClient' | 'updateClient' | 'searchClients';
  spreadsheetId: string;
  data?: Record<string, unknown>;
  searchQuery?: string;
}

// Get access token using service account
async function getAccessToken(credentials: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  // Create JWT header and claim
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat: now,
  };

  // Encode to base64url
  const base64url = (str: string) => 
    btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const headerB64 = base64url(JSON.stringify(header));
  const claimB64 = base64url(JSON.stringify(claim));
  const signatureInput = `${headerB64}.${claimB64}`;

  // Import the private key and sign
  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = credentials.private_key
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\n/g, '')  // Remove actual newlines (already converted from \\n)
    .replace(/\s/g, '');
  
  const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const signatureB64 = base64url(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${signatureInput}.${signatureB64}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }
  return tokenData.access_token;
}

// Get dropdown values from setup sheet
async function getDropdowns(accessToken: string, spreadsheetId: string) {
  const range = encodeURIComponent("'CLIENT TRACKER SETUP DATA'!A2:H100");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (getDropdowns):', response.status, errorText);
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (!data.values) return { sources: [], whatsappOwners: [], clientLocations: [], eventLocations: [], teamMembers: [], oldClients: [] };

  const rows = data.values;
  const getColumn = (idx: number) => rows.map((row: string[]) => row[idx]).filter(Boolean);

  return {
    sources: getColumn(0),           // Column A
    clientLocations: getColumn(1),    // Column B
    eventLocations: getColumn(2),     // Column C
    preweddingEvents: getColumn(3),   // Column D
    weddingEvents: getColumn(4),      // Column E
    postweddingEvents: getColumn(5),  // Column F
    oldClients: getColumn(6),         // Column G
    whatsappOwners: getColumn(7),     // Column H (also team members)
  };
}

// Get recent clients
async function getClients(accessToken: string, spreadsheetId: string, limit = 50) {
  const range = encodeURIComponent("'WTN CLIENT TRACKER'!A2:U" + (limit + 1));
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (getClients):', response.status, errorText);
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (!data.values) return [];

  return data.values.map((row: string[], index: number) => ({
    rowNumber: index + 2,
    registeredDateTimeAD: row[0] || '',
    registeredDateBS: row[1] || '',
    clientName: row[2] || '',
    source: row[3] || '',
    clientLocation: row[4] || '',
    currentCountry: row[5] || '',
    contactNo: row[6] || '',
    whatsappNo: row[7] || '',
    // Column I (index 8) - might be empty
    eventLocation: row[9] || '',
    eventCity: row[10] || '',
    events: row[11] || '',
    eventYear: row[12] || '',
    eventMonth: row[13] || '',
    eventDay: row[14] || '',
    eventDateAD: row[15] || '',
    whoAdded: row[16] || '',
    inquiryDateAD: row[17] || '',
    inquiryDateBS: row[18] || '',
    inquiryTime: row[19] || '',
    description: row[20] || '',
  }));
}

// Add new client at row 2
async function addClient(accessToken: string, spreadsheetId: string, clientData: Record<string, unknown>) {
  const sheetId = await getSheetId(accessToken, spreadsheetId, 'WTN CLIENT TRACKER');
  
  // First, insert a new row at position 2
  const insertUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  await fetch(insertUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        insertDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: 1, // Row 2 (0-indexed)
            endIndex: 2,
          },
          inheritFromBefore: false,
        },
      }],
    }),
  });

  // Now write data to row 2
  const now = new Date();
  const registeredDateTimeAD = now.toISOString();
  
  // Convert AD to BS (simplified - you may want more accurate conversion)
  const bsDate = adToBSSimple(now);
  
  const values = [[
    registeredDateTimeAD,                    // A: registered_datetime_ad
    bsDate,                                  // B: registered_date_bs
    clientData.clientName || '',             // C: client_name
    clientData.source || '',                 // D: source
    clientData.clientLocation || '',         // E: client_current_country
    clientData.currentCountry || '',         // F: current_country_name
    clientData.contactNo || '',              // G: contact_no
    clientData.whatsappNo || '',             // H: whatsapp_no
    '',                                      // I: (empty)
    clientData.eventLocation || '',          // J: event_location_city
    clientData.eventCity || '',              // K: event_city_name
    clientData.events || '',                 // L: events
    clientData.eventYear || '',              // M: event year
    clientData.eventMonth || '',             // N: event month
    clientData.eventDay || '',               // O: event day
    clientData.eventDateAD || '',            // P: event date AD
    clientData.whoAdded || '',               // Q: who_added
    clientData.inquiryDateAD || now.toISOString().split('T')[0], // R: inquiry_date_ad
    clientData.inquiryDateBS || bsDate,      // S: inquiry_date_bs
    clientData.inquiryTime || '',            // T: inquiry_time
    clientData.description || '',            // U: basic_description
  ]];

  const range = encodeURIComponent("'WTN CLIENT TRACKER'!A2:U2");
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  return response.json();
}

// Search clients
async function searchClients(accessToken: string, spreadsheetId: string, query: string) {
  const clients = await getClients(accessToken, spreadsheetId, 500);
  const lowerQuery = query.toLowerCase();
  
  return clients.filter((client: Record<string, string>) => 
    client.clientName?.toLowerCase().includes(lowerQuery) ||
    client.contactNo?.includes(query) ||
    client.whatsappNo?.includes(query)
  ).slice(0, 20);
}

// Helper: Get sheet ID by name
async function getSheetId(accessToken: string, spreadsheetId: string, sheetName: string): Promise<number> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (getSheetId):', response.status, errorText);
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }
  
  const data = await response.json();
  const sheet = data.sheets?.find((s: { properties: { title: string } }) => 
    s.properties.title === sheetName
  );
  return sheet?.properties?.sheetId ?? 0;
}

// Simple AD to BS conversion (approximate)
function adToBSSimple(date: Date): string {
  // This is a simplified conversion - the actual app uses nepali-date-converter on frontend
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  
  // Approximate BS year (AD + 56/57 years)
  const bsYear = year + 56 + (month < 4 ? 0 : 1);
  const bsMonth = ((month + 8) % 12) + 1;
  
  return `${bsYear}-${String(bsMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Load credentials from individual environment variables (to avoid 1024 char limit)
    const clientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL');
    const privateKeyRaw = Deno.env.get('GOOGLE_PRIVATE_KEY');
    const projectId = Deno.env.get('GOOGLE_PROJECT_ID');
    const privateKeyId = Deno.env.get('GOOGLE_PRIVATE_KEY_ID');
    const configuredSpreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID');

    if (!clientEmail || !privateKeyRaw || !projectId) {
      throw new Error('Missing required Google service account secrets (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_PROJECT_ID)');
    }

    // Handle the private key newlines - replace escaped newlines with actual newlines
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

    const credentials: ServiceAccountCredentials = {
      type: 'service_account',
      project_id: projectId,
      private_key_id: privateKeyId || '',
      private_key: privateKey,
      client_email: clientEmail,
      client_id: '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
    };
    
    const accessToken = await getAccessToken(credentials);

    const body: SheetRequest = await req.json();
    const { action, spreadsheetId: requestSpreadsheetId, data, searchQuery } = body;

    // Use configured spreadsheet ID from backend secret, fall back to request
    let spreadsheetId = configuredSpreadsheetId || requestSpreadsheetId || '';

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID not configured. Please contact admin.');
    }

    // Extract spreadsheet ID from full URL if provided
    if (spreadsheetId.includes('docs.google.com')) {
      const match = spreadsheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        spreadsheetId = match[1];
        console.log('Extracted spreadsheet ID from URL:', spreadsheetId);
      } else {
        throw new Error('Could not extract spreadsheet ID from the provided URL');
      }
    }

    let result;

    switch (action) {
      case 'getDropdowns':
        result = await getDropdowns(accessToken, spreadsheetId);
        break;
      case 'getClients':
        result = await getClients(accessToken, spreadsheetId);
        break;
      case 'addClient':
        if (!data) throw new Error('data is required for addClient');
        result = await addClient(accessToken, spreadsheetId, data);
        break;
      case 'searchClients':
        if (!searchQuery) throw new Error('searchQuery is required for searchClients');
        result = await searchClients(accessToken, spreadsheetId, searchQuery);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Google Sheets error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
