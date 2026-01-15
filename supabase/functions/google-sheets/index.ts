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
  action: 'getDropdowns' | 'getClients' | 'addClient' | 'updateClient' | 'searchClients' | 'testConnection' | 'getClientStatuses' | 'updateClientStatus' | 'addOldClient' | 'bulkUpdateStatus' | 'updateClientHandler' | 'logCallAttempt';
  spreadsheetId?: string;
  data?: Record<string, unknown>;
  searchQuery?: string;
  limit?: number;
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
  const range = encodeURIComponent("'CLIENT TRACKER SETUP DATA'!A2:I100");
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
  if (!data.values) return { sources: [], whatsappOwners: [], clientLocations: [], eventLocations: [], teamMembers: [], oldClients: [], clientStatuses: [] };

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
    clientStatuses: getColumn(8),     // Column I - Client Status dropdown options
  };
}

// Get client statuses from Column I of setup data
async function getClientStatuses(accessToken: string, spreadsheetId: string) {
  const range = encodeURIComponent("'CLIENT TRACKER SETUP DATA'!I2:I100");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (getClientStatuses):', response.status, errorText);
    throw new Error(`Google Sheets API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.values) return [];
  
  return data.values.flat().filter(Boolean);
}

// Update client status in Column W with timestamp log
async function updateClientStatus(accessToken: string, spreadsheetId: string, rowNumber: number, newStatus: string, existingStatusLog: string, clientTimestamp?: string) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating status');
  }

  // Use client-provided timestamp if available, otherwise generate server timestamp
  let timestamp: string;
  if (clientTimestamp) {
    timestamp = clientTimestamp;
  } else {
    const now = new Date();
    // Format as MM/DD/YYYY, HH:MM:SS in UTC+5:45 (Nepal timezone)
    const nepalOffset = 5 * 60 + 45; // 5 hours 45 minutes in minutes
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const nepalTime = new Date(utcTime + (nepalOffset * 60000));
    
    const month = String(nepalTime.getMonth() + 1).padStart(2, '0');
    const day = String(nepalTime.getDate()).padStart(2, '0');
    const year = nepalTime.getFullYear();
    const hours = String(nepalTime.getHours()).padStart(2, '0');
    const mins = String(nepalTime.getMinutes()).padStart(2, '0');
    const secs = String(nepalTime.getSeconds()).padStart(2, '0');
    
    timestamp = `${month}/${day}/${year}, ${hours}:${mins}:${secs}`;
  }
  
  // Append new status with timestamp to existing log
  const newLogEntry = `${newStatus} - ${timestamp}`;
  const updatedLog = existingStatusLog 
    ? `${existingStatusLog}\n${newLogEntry}` 
    : newLogEntry;

  const range = encodeURIComponent(`'CLIENT TRACKER'!W${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[updatedLog]] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (updateClientStatus):', response.status, errorText);
    throw new Error(`Failed to update client status: ${response.status}`);
  }

  return { success: true, statusLog: updatedLog };
}

// Get recent clients (now including Column W for status, Column X for handler, Column Y for call log)
async function getClients(accessToken: string, spreadsheetId: string, limit = 50) {
  const range = encodeURIComponent("'CLIENT TRACKER'!A2:Y" + (limit + 1));
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
    // Column V (index 21) - might be empty
    statusLog: row[22] || '', // Column W (index 22) - Status log with timestamps
    clientHandler: row[23] || '', // Column X (index 23) - Client handler
    callLog: row[24] || '', // Column Y (index 24) - Call attempt history
  }));
}

// Log call attempt to Column Y
async function logCallAttempt(
  accessToken: string, 
  spreadsheetId: string, 
  rowNumber: number, 
  callType: 'DIRECT' | 'WHATSAPP',
  existingCallLog: string,
  clientTime: string,
  clientDate: string
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for logging call');
  }

  // Count existing calls to determine ordinal
  const existingLines = existingCallLog ? existingCallLog.split('\n').filter(Boolean).length : 0;
  const callNumber = existingLines + 1;
  
  // Get ordinal suffix
  const getOrdinal = (n: number): string => {
    if (n % 100 >= 11 && n % 100 <= 13) return 'TH';
    switch (n % 10) {
      case 1: return 'ST';
      case 2: return 'ND';
      case 3: return 'RD';
      default: return 'TH';
    }
  };
  
  // Format: "1ST DIRECT CALL AT 12:53 PM ON 2026-01-16"
  const newLogEntry = `${callNumber}${getOrdinal(callNumber)} ${callType} CALL AT ${clientTime} ON ${clientDate}`;
  const updatedLog = existingCallLog 
    ? `${existingCallLog}\n${newLogEntry}` 
    : newLogEntry;

  const range = encodeURIComponent(`'CLIENT TRACKER'!Y${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[updatedLog]] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (logCallAttempt):', response.status, errorText);
    throw new Error(`Failed to log call attempt: ${response.status}`);
  }

  return { success: true, callLog: updatedLog };
}

// Add new client at row 2
async function addClient(accessToken: string, spreadsheetId: string, clientData: Record<string, unknown>) {
  const sheetId = await getSheetId(accessToken, spreadsheetId, 'CLIENT TRACKER');
  
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
  
  // Use BS dates sent from frontend (accurate conversion using nepali-date-converter)
  // Fallback to simplified conversion only if not provided
  const registeredBS = clientData.registeredDateBS || adToBSSimple(now);
  const inquiryBS = clientData.inquiryDateBS || adToBSSimple(now);
  
  // Create initial status log with selected status (default: "JUST ENQUIRED") and Nepal timezone timestamp
  const nepalOffset = 5.75 * 60 * 60 * 1000; // UTC+5:45 in milliseconds
  const nepalTime = new Date(now.getTime() + nepalOffset);
  const nepalTimeStr = nepalTime.toISOString().replace('T', ' ').substring(0, 19);
  const selectedStatus = (clientData.initialStatus as string) || 'JUST ENQUIRED';
  const initialStatusLog = `${selectedStatus.toUpperCase()} [${nepalTimeStr}]`;
  
  const values = [[
    registeredDateTimeAD,                    // A: registered_datetime_ad
    registeredBS,                            // B: registered_date_bs (from frontend)
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
    inquiryBS,                               // S: inquiry_date_bs (from frontend)
    clientData.inquiryTime || '',            // T: inquiry_time
    clientData.description || '',            // U: basic_description
    '',                                      // V: (empty)
    initialStatusLog,                        // W: status_log - Initial "JUST ENQUIRED" status
    clientData.clientHandler || '',          // X: client_handler
  ]];

  const range = encodeURIComponent("'CLIENT TRACKER'!A2:X2");
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

// Update existing client
async function updateClient(accessToken: string, spreadsheetId: string, clientData: Record<string, unknown>) {
  const rowNumber = clientData.rowNumber as number;
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating client');
  }

  const values = [[
    clientData.registeredDateTimeAD || '',   // A: registered_datetime_ad (keep original)
    clientData.registeredDateBS || '',       // B: registered_date_bs (keep original)
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
    clientData.inquiryDateAD || '',          // R: inquiry_date_ad
    clientData.inquiryDateBS || '',          // S: inquiry_date_bs
    clientData.inquiryTime || '',            // T: inquiry_time
    clientData.description || '',            // U: basic_description
  ]];

  const range = encodeURIComponent(`'CLIENT TRACKER'!A${rowNumber}:U${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (updateClient):', response.status, errorText);
    throw new Error(`Failed to update client: ${response.status}`);
  }

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

// Test connection - validates spreadsheet access and returns metadata
async function testConnection(accessToken: string, spreadsheetId: string, clientEmail: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (testConnection):', response.status, errorText);
    
    if (response.status === 404) {
      throw new Error(`SHEET_NOT_FOUND: ID used: ${spreadsheetId.substring(0, 8)}...${spreadsheetId.substring(spreadsheetId.length - 6)} (len: ${spreadsheetId.length}). Either incorrect ID or not shared with: ${clientEmail}`);
    }
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  const sheetNames = data.sheets?.map((s: { properties: { title: string } }) => s.properties.title) || [];
  
  return {
    title: data.properties?.title || 'Unknown',
    sheets: sheetNames,
    serviceAccountEmail: clientEmail,
    spreadsheetIdMasked: `...${spreadsheetId.slice(-6)}`,
  };
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

// Add a new old client name to Column G of CLIENT TRACKER SETUP DATA
async function addOldClient(accessToken: string, spreadsheetId: string, clientName: string) {
  // First, get the current values in Column G to find the next empty row
  const range = encodeURIComponent("'CLIENT TRACKER SETUP DATA'!G2:G100");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (addOldClient - read):', response.status, errorText);
    throw new Error(`Google Sheets API error: ${response.status}`);
  }

  const data = await response.json();
  const values = data.values || [];
  
  // Check if the client name already exists
  const existingNames = values.flat().map((v: string) => v?.toLowerCase().trim());
  if (existingNames.includes(clientName.toLowerCase().trim())) {
    return { success: true, message: 'Client already exists', alreadyExists: true };
  }
  
  // Find the next empty row (values.length + 2 because we start from row 2)
  const nextRow = values.length + 2;
  
  // Write the new client name
  const writeRange = encodeURIComponent(`'CLIENT TRACKER SETUP DATA'!G${nextRow}`);
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`;
  
  const writeResponse = await fetch(writeUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[clientName.trim()]] }),
  });

  if (!writeResponse.ok) {
    const errorText = await writeResponse.text();
    console.error('Google Sheets API error (addOldClient - write):', writeResponse.status, errorText);
    throw new Error(`Failed to add old client: ${writeResponse.status}`);
  }

  return { success: true, message: 'Client added successfully', alreadyExists: false };
}

// Update client handler in Column X
async function updateClientHandler(accessToken: string, spreadsheetId: string, rowNumber: number, handler: string) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating handler');
  }

  const range = encodeURIComponent(`'CLIENT TRACKER'!X${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[handler]] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (updateClientHandler):', response.status, errorText);
    throw new Error(`Failed to update client handler: ${response.status}`);
  }

  return { success: true };
}

// Bulk update status for clients matching a specific status
async function bulkUpdateStatus(accessToken: string, spreadsheetId: string, fromStatus: string, toStatus: string) {
  // First, get all clients
  const clients = await getClients(accessToken, spreadsheetId, 500);
  
  const now = new Date();
  const timestamp = now.toLocaleString('en-US', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false 
  });
  
  let updatedCount = 0;
  
  // Find clients with matching status and update them
  for (const client of clients) {
    const statusLog = client.statusLog || '';
    const currentStatus = getCurrentStatusFromLog(statusLog);
    
    if (currentStatus.toUpperCase() === fromStatus.toUpperCase()) {
      const newLogEntry = `${toStatus} - ${timestamp}`;
      const updatedLog = statusLog ? `${statusLog}\n${newLogEntry}` : newLogEntry;
      
      const range = encodeURIComponent(`'CLIENT TRACKER'!W${client.rowNumber}`);
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
      
      await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [[updatedLog]] }),
      });
      
      updatedCount++;
    }
  }
  
  return { success: true, updatedCount };
}

// Helper to get current status from status log
function getCurrentStatusFromLog(statusLog: string): string {
  if (!statusLog) return 'UNTOUCHED';
  const lines = statusLog.split('\n');
  const lastLine = lines[lines.length - 1];
  const match = lastLine.match(/^(.+?)\s*-\s*\d/);
  return match ? match[1].trim() : 'UNTOUCHED';
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
    let spreadsheetId = (configuredSpreadsheetId || requestSpreadsheetId || '').trim();

    // Debug logging for spreadsheet ID
    console.log('Spreadsheet ID config:', {
      length: spreadsheetId.length,
      prefix: spreadsheetId.substring(0, 8),
      suffix: spreadsheetId.substring(Math.max(0, spreadsheetId.length - 6)),
      looksLikeUrl: spreadsheetId.includes('docs.google.com'),
      hasNewlines: spreadsheetId.includes('\n'),
      hasSpaces: spreadsheetId.includes(' '),
    });

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
      case 'testConnection':
        result = await testConnection(accessToken, spreadsheetId, clientEmail);
        break;
      case 'getDropdowns':
        result = await getDropdowns(accessToken, spreadsheetId);
        break;
      case 'getClients':
        result = await getClients(accessToken, spreadsheetId, body.limit);
        break;
      case 'addClient':
        if (!data) throw new Error('data is required for addClient');
        result = await addClient(accessToken, spreadsheetId, data);
        break;
      case 'updateClient':
        if (!data) throw new Error('data is required for updateClient');
        result = await updateClient(accessToken, spreadsheetId, data);
        break;
      case 'searchClients':
        if (!searchQuery) throw new Error('searchQuery is required for searchClients');
        result = await searchClients(accessToken, spreadsheetId, searchQuery);
        break;
      case 'getClientStatuses':
        result = await getClientStatuses(accessToken, spreadsheetId);
        break;
      case 'updateClientStatus':
        if (!data) throw new Error('data is required for updateClientStatus');
        result = await updateClientStatus(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.newStatus as string, 
          data.existingStatusLog as string || '',
          data.clientTimestamp as string | undefined
        );
        break;
      case 'addOldClient':
        if (!data || !data.clientName) throw new Error('clientName is required for addOldClient');
        result = await addOldClient(accessToken, spreadsheetId, data.clientName as string);
        break;
      case 'bulkUpdateStatus':
        if (!data || !data.fromStatus || !data.toStatus) throw new Error('fromStatus and toStatus are required for bulkUpdateStatus');
        result = await bulkUpdateStatus(accessToken, spreadsheetId, data.fromStatus as string, data.toStatus as string);
        break;
      case 'updateClientHandler':
        if (!data || !data.rowNumber || data.handler === undefined) throw new Error('rowNumber and handler are required for updateClientHandler');
        result = await updateClientHandler(accessToken, spreadsheetId, data.rowNumber as number, data.handler as string);
        break;
      case 'logCallAttempt':
        if (!data || !data.rowNumber || !data.callType) throw new Error('rowNumber and callType are required for logCallAttempt');
        result = await logCallAttempt(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.callType as 'DIRECT' | 'WHATSAPP',
          data.existingCallLog as string || '',
          data.clientTime as string,
          data.clientDate as string
        );
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
