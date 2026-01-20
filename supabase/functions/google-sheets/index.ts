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
  action: 'getDropdowns' | 'getClients' | 'addClient' | 'updateClient' | 'searchClients' | 'testConnection' | 'getClientStatuses' | 'updateClientStatus' | 'addOldClient' | 'bulkUpdateStatus' | 'updateClientHandler' | 'logCallAttempt' | 'updateClientQuotation' | 'updateClientMindset' | 'updateBargainingRates' | 'updateClientBargainedRates' | 'updateOurCounterRates' | 'addClientComment' | 'updateFinalQuotation' | 'addPayment' | 'getBookedClients' | 'migrateExistingBookedClients' | 'updateBookedClient';
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
  const range = encodeURIComponent("'CLIENT TRACKER SETUP DATA'!A2:Q100");
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
  if (!data.values) return { sources: [], whatsappOwners: [], clientLocations: [], eventLocations: [], teamMembers: [], oldClients: [], clientStatuses: [], mindsetOptions: [], paymentTypes: [], banks: [] };

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
    mindsetOptions: getColumn(10),    // Column K - Mindset options for QUOTATION SENT
    banks: getColumn(15),             // Column P - Bank names
    paymentTypes: getColumn(16),      // Column Q - Payment types (ADVANCE, PARTIAL, FULL)
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

  // If status is BOOKED, copy to BOOKED CLIENTS sheet
  let copiedToBooked = false;
  if (newStatus.toUpperCase() === 'BOOKED') {
    const isAlreadyBooked = await checkIfAlreadyBooked(accessToken, spreadsheetId, rowNumber);
    if (!isAlreadyBooked) {
      await copyToBookedClients(accessToken, spreadsheetId, rowNumber);
      copiedToBooked = true;
    }
  }

  return { success: true, statusLog: updatedLog, copiedToBooked };
}

// Get recent clients (now including Column W for status, Column X for handler, Column Y for call log, Column Z for mindset, AA/AB for bargaining, AC for comments, AD for final quotation, AE/AF/AG for payments)
async function getClients(accessToken: string, spreadsheetId: string, limit = 50) {
  const range = encodeURIComponent("'CLIENT TRACKER'!A2:AG" + (limit + 1));
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
    quotationData: row[21] || '', // Column V (index 21) - Quotation amounts
    statusLog: row[22] || '', // Column W (index 22) - Status log with timestamps
    clientHandler: row[23] || '', // Column X (index 23) - Client handler
    callLog: row[24] || '', // Column Y (index 24) - Call attempt history
    mindset: row[25] || '', // Column Z (index 25) - Mindset with timestamp
    ourBargainedRates: row[26] || '', // Column AA (index 26) - Our bargained rates
    clientBargainedRates: row[27] || '', // Column AB (index 27) - Client bargained rates
    comments: row[28] || '', // Column AC (index 28) - Client comments with timestamps
    finalQuotation: row[29] || '', // Column AD (index 29) - Final booked quotation
    paymentsMade: row[30] || '', // Column AE (index 30) - Payments made log
    paymentDatesAD: row[31] || '', // Column AF (index 31) - Payment dates in AD
    remainingPayment: row[32] || '', // Column AG (index 32) - Remaining payment
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

// Update client quotation in Column V
async function updateClientQuotation(accessToken: string, spreadsheetId: string, rowNumber: number, quotationData: string) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating quotation');
  }

  const range = encodeURIComponent(`'CLIENT TRACKER'!V${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[quotationData]] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (updateClientQuotation):', response.status, errorText);
    throw new Error(`Failed to update quotation: ${response.status}`);
  }

  return { success: true };
}

// Update client mindset in Column Z with timestamp
async function updateClientMindset(accessToken: string, spreadsheetId: string, rowNumber: number, mindset: string, clientTimestamp: string) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating mindset');
  }

  // Store as "MINDSET - MM/DD/YYYY, HH:MM:SS"
  const mindsetWithTimestamp = `${mindset} - ${clientTimestamp}`;

  const range = encodeURIComponent(`'CLIENT TRACKER'!Z${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[mindsetWithTimestamp]] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (updateClientMindset):', response.status, errorText);
    throw new Error(`Failed to update mindset: ${response.status}`);
  }

  return { success: true, mindset: mindsetWithTimestamp };
}

// Add comment to Column AC with timestamp
async function addClientComment(
  accessToken: string,
  spreadsheetId: string,
  rowNumber: number,
  comment: string,
  existingComments: string,
  clientTimestamp: string
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for adding comment');
  }

  // Format: "[MM/DD/YYYY HH:MM] Comment text" - using ||| delimiter for multi-line support
  const newCommentEntry = `[${clientTimestamp}] ${comment}`;
  const updatedComments = existingComments 
    ? `${existingComments}|||${newCommentEntry}` 
    : newCommentEntry;

  const range = encodeURIComponent(`'CLIENT TRACKER'!AC${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[updatedComments]] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (addClientComment):', response.status, errorText);
    throw new Error(`Failed to add comment: ${response.status}`);
  }

  return { success: true, comments: updatedComments };
}

// Update bargaining rates in Columns AA (our rates) and AB (client rates)
async function updateBargainingRates(
  accessToken: string, 
  spreadsheetId: string, 
  rowNumber: number, 
  ourRates: string, 
  clientRates: string
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating bargaining rates');
  }

  // Update both columns in one batch
  const range = encodeURIComponent(`'CLIENT TRACKER'!AA${rowNumber}:AB${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[ourRates, clientRates]] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (updateBargainingRates):', response.status, errorText);
    throw new Error(`Failed to update bargaining rates: ${response.status}`);
  }

  return { success: true, ourBargainedRates: ourRates, clientBargainedRates: clientRates };
}

// Update only client bargained rates in Column AB (for BARGAINING IS ON category)
async function updateClientBargainedRates(
  accessToken: string, 
  spreadsheetId: string, 
  rowNumber: number, 
  clientRates: string
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating client bargained rates');
  }

  // Update only Column AB
  const range = encodeURIComponent(`'CLIENT TRACKER'!AB${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[clientRates]] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (updateClientBargainedRates):', response.status, errorText);
    throw new Error(`Failed to update client bargained rates: ${response.status}`);
  }

  return { success: true, clientBargainedRates: clientRates };
}

// Update only our counter rates in Column AA (for BARGAINING IS ON category)
async function updateOurCounterRates(
  accessToken: string, 
  spreadsheetId: string, 
  rowNumber: number, 
  ourRates: string
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating our counter rates');
  }

  // Update only Column AA
  const range = encodeURIComponent(`'CLIENT TRACKER'!AA${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[ourRates]] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (updateOurCounterRates):', response.status, errorText);
    throw new Error(`Failed to update our counter rates: ${response.status}`);
  }

  return { success: true, ourBargainedRates: ourRates };
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

// Update final quotation in Column AD (for BOOKED clients)
async function updateFinalQuotation(
  accessToken: string, 
  spreadsheetId: string, 
  rowNumber: number, 
  finalQuotation: string
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating final quotation');
  }

  const range = encodeURIComponent(`'CLIENT TRACKER'!AD${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[finalQuotation]] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (updateFinalQuotation):', response.status, errorText);
    throw new Error(`Failed to update final quotation: ${response.status}`);
  }

  return { success: true, finalQuotation };
}

// Add payment entry to Columns AE, AF, AG for BOOKED clients
async function addPayment(
  accessToken: string, 
  spreadsheetId: string, 
  rowNumber: number,
  paymentAmount: string,
  paymentType: string,
  nepaliDate: string,
  nepaliDateAD: string, // AD equivalent of the selected Nepali date
  bank: string,
  existingPaymentsMade: string,
  existingPaymentDatesAD: string,
  finalQuotationAmount: number
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for adding payment');
  }

  // Use the AD date that corresponds to the selected Nepali date
  const adDate = nepaliDateAD;
  
  // Get weekday abbreviation from the AD date
  // Parse date parts manually to avoid timezone issues with new Date("YYYY-MM-DD")
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const [yearPart, monthPart, dayPart] = nepaliDateAD.split('-').map(Number);
  // Create date using local timezone (month is 0-indexed in Date constructor)
  const adDateObj = new Date(yearPart, monthPart - 1, dayPart);
  const weekday = weekdays[adDateObj.getDay()];
  
  // Format the payment entry: "NPR 30,000/- AS ADVANCE ON SUN 2082-10-04 IN MASTER BARUN"
  const formattedAmount = `NPR ${parseInt(paymentAmount).toLocaleString('en-IN')}/-`;
  const newPaymentEntry = `${formattedAmount} AS ${paymentType} ON ${weekday} ${nepaliDate} IN ${bank}`;
  
  // Append to existing payments with newline
  const updatedPaymentsMade = existingPaymentsMade 
    ? `${existingPaymentsMade}\n${newPaymentEntry}` 
    : newPaymentEntry;
  
  // Update payment dates AD
  const updatedPaymentDatesAD = existingPaymentDatesAD 
    ? `${existingPaymentDatesAD}\n${adDate}` 
    : adDate;
  
  // Calculate remaining payment
  // Parse all payment amounts from the payment log
  const allPayments = updatedPaymentsMade.split('\n').filter(Boolean);
  let totalPaid = 0;
  for (const entry of allPayments) {
    const match = entry.match(/NPR\s*([\d,]+)\/-/);
    if (match) {
      totalPaid += parseInt(match[1].replace(/,/g, ''));
    }
  }
  
  const remaining = finalQuotationAmount - totalPaid;
  const remainingFormatted = `NPR ${remaining.toLocaleString('en-IN')}/-`;
  
  // Update all three columns at once (AE, AF, AG)
  const range = encodeURIComponent(`'CLIENT TRACKER'!AE${rowNumber}:AG${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[updatedPaymentsMade, updatedPaymentDatesAD, remainingFormatted]] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (addPayment):', response.status, errorText);
    throw new Error(`Failed to add payment: ${response.status}`);
  }

  return { 
    success: true, 
    paymentsMade: updatedPaymentsMade, 
    paymentDatesAD: updatedPaymentDatesAD,
    remainingPayment: remainingFormatted,
    totalPaid
  };
}

// Check if a client is already in the BOOKED CLIENTS sheet by original row number
async function checkIfAlreadyBooked(accessToken: string, spreadsheetId: string, originalRowNumber: number): Promise<boolean> {
  const range = encodeURIComponent("'BOOKED CLIENTS'!A2:A500");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      // Sheet might not exist yet, return false
      console.log('BOOKED CLIENTS sheet may not exist, skipping check');
      return false;
    }

    const data = await response.json();
    if (!data.values) return false;
    
    // Check if any row has this original row number
    return data.values.some((row: string[]) => parseInt(row[0]) === originalRowNumber);
  } catch (error) {
    console.error('Error checking if already booked:', error);
    return false;
  }
}

// Copy a client from CLIENT TRACKER to BOOKED CLIENTS sheet
async function copyToBookedClients(accessToken: string, spreadsheetId: string, originalRowNumber: number) {
  // First, read the full client data from CLIENT TRACKER
  const clientRange = encodeURIComponent(`'CLIENT TRACKER'!A${originalRowNumber}:AG${originalRowNumber}`);
  const clientUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clientRange}`;
  
  const clientResponse = await fetch(clientUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!clientResponse.ok) {
    const errorText = await clientResponse.text();
    console.error('Error reading client for copy:', errorText);
    throw new Error(`Failed to read client for copy: ${clientResponse.status}`);
  }

  const clientData = await clientResponse.json();
  if (!clientData.values || clientData.values.length === 0) {
    throw new Error('Client data not found');
  }

  const clientRow = clientData.values[0];

  // Get the sheet ID for BOOKED CLIENTS to insert a new row
  const sheetId = await getSheetId(accessToken, spreadsheetId, 'BOOKED CLIENTS');
  
  // Insert a new row at position 2
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

  // Generate booked datetime
  const now = new Date();
  const nepalOffset = 5.75 * 60 * 60 * 1000;
  const nepalTime = new Date(now.getTime() + nepalOffset);
  const bookedDateTime = nepalTime.toISOString().replace('T', ' ').substring(0, 19);

  // Prepare the data for BOOKED CLIENTS (Column A = original row number, rest = client data)
  // Column A: Original Row Number
  // Columns B onwards: Same as CLIENT TRACKER columns A-AG
  const bookedValues = [[
    originalRowNumber.toString(),  // A: Original Row Number from CLIENT TRACKER
    clientRow[0] || '',   // B: Registered DateTime AD
    clientRow[1] || '',   // C: Registered Date BS
    clientRow[2] || '',   // D: Client Name
    clientRow[3] || '',   // E: Source
    clientRow[4] || '',   // F: Client Location
    clientRow[5] || '',   // G: Current Country
    clientRow[6] || '',   // H: Contact No
    clientRow[7] || '',   // I: WhatsApp No
    clientRow[8] || '',   // J: (empty)
    clientRow[9] || '',   // K: Event Location
    clientRow[10] || '',  // L: Event City
    clientRow[11] || '',  // M: Events
    clientRow[12] || '',  // N: Event Year
    clientRow[13] || '',  // O: Event Month
    clientRow[14] || '',  // P: Event Day
    clientRow[15] || '',  // Q: Event Date AD
    clientRow[16] || '',  // R: Who Added
    clientRow[17] || '',  // S: Inquiry Date AD
    clientRow[18] || '',  // T: Inquiry Date BS
    clientRow[19] || '',  // U: Inquiry Time
    clientRow[20] || '',  // V: Description
    clientRow[21] || '',  // W: Quotation Data
    clientRow[22] || '',  // X: Status Log
    clientRow[23] || '',  // Y: Client Handler
    clientRow[24] || '',  // Z: Call Log
    clientRow[25] || '',  // AA: Mindset
    clientRow[26] || '',  // AB: Our Bargained Rates
    clientRow[27] || '',  // AC: Client Bargained Rates
    clientRow[28] || '',  // AD: Comments
    clientRow[29] || '',  // AE: Final Quotation
    clientRow[30] || '',  // AF: Payments Made
    clientRow[31] || '',  // AG: Payment Dates AD
    clientRow[32] || '',  // AH: Remaining Payment
    bookedDateTime,       // AI: Booked DateTime
  ]];

  // Write the data to row 2 of BOOKED CLIENTS
  const writeRange = encodeURIComponent("'BOOKED CLIENTS'!A2:AI2");
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`;
  
  const writeResponse = await fetch(writeUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: bookedValues }),
  });

  if (!writeResponse.ok) {
    const errorText = await writeResponse.text();
    console.error('Error writing to BOOKED CLIENTS:', errorText);
    throw new Error(`Failed to copy to BOOKED CLIENTS: ${writeResponse.status}`);
  }

  console.log(`Successfully copied client from row ${originalRowNumber} to BOOKED CLIENTS`);
  return { success: true };
}

// Get all clients from BOOKED CLIENTS sheet
async function getBookedClients(accessToken: string, spreadsheetId: string, limit = 100) {
  const range = encodeURIComponent("'BOOKED CLIENTS'!A2:AI" + (limit + 1));
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (getBookedClients):', response.status, errorText);
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (!data.values) return [];

  return data.values.map((row: string[], index: number) => ({
    bookedRowNumber: index + 2,
    originalRowNumber: parseInt(row[0]) || 0,
    registeredDateTimeAD: row[1] || '',
    registeredDateBS: row[2] || '',
    clientName: row[3] || '',
    source: row[4] || '',
    clientLocation: row[5] || '',
    currentCountry: row[6] || '',
    contactNo: row[7] || '',
    whatsappNo: row[8] || '',
    // Column J (index 9) - empty
    eventLocation: row[10] || '',
    eventCity: row[11] || '',
    events: row[12] || '',
    eventYear: row[13] || '',
    eventMonth: row[14] || '',
    eventDay: row[15] || '',
    eventDateAD: row[16] || '',
    whoAdded: row[17] || '',
    inquiryDateAD: row[18] || '',
    inquiryDateBS: row[19] || '',
    inquiryTime: row[20] || '',
    description: row[21] || '',
    quotationData: row[22] || '',
    statusLog: row[23] || '',
    clientHandler: row[24] || '',
    callLog: row[25] || '',
    mindset: row[26] || '',
    ourBargainedRates: row[27] || '',
    clientBargainedRates: row[28] || '',
    comments: row[29] || '',
    finalQuotation: row[30] || '',
    paymentsMade: row[31] || '',
    paymentDatesAD: row[32] || '',
    remainingPayment: row[33] || '',
    bookedDateTime: row[34] || '',
  }));
}

// Migrate existing BOOKED clients from CLIENT TRACKER to BOOKED CLIENTS
async function migrateExistingBookedClients(accessToken: string, spreadsheetId: string) {
  // Get all clients from CLIENT TRACKER
  const clients = await getClients(accessToken, spreadsheetId, 500);
  
  let migratedCount = 0;
  
  for (const client of clients) {
    const statusLog = client.statusLog || '';
    const currentStatus = getCurrentStatusFromLog(statusLog);
    
    // Check if client is BOOKED
    if (currentStatus.toUpperCase() === 'BOOKED') {
      // Check if already in BOOKED CLIENTS
      const isAlreadyBooked = await checkIfAlreadyBooked(accessToken, spreadsheetId, client.rowNumber);
      
      if (!isAlreadyBooked) {
        await copyToBookedClients(accessToken, spreadsheetId, client.rowNumber);
        migratedCount++;
      }
    }
  }
  
  return { success: true, migratedCount };
}

// Update a booked client in both BOOKED CLIENTS and CLIENT TRACKER sheets
async function updateBookedClient(
  accessToken: string, 
  spreadsheetId: string, 
  bookedRowNumber: number,
  originalRowNumber: number,
  updates: Record<string, unknown>
) {
  // Map of field names to column letters in BOOKED CLIENTS sheet
  const columnMap: Record<string, string> = {
    finalQuotation: 'AE',
    paymentsMade: 'AF',
    paymentDatesAD: 'AG',
    remainingPayment: 'AH',
    clientHandler: 'Y',
    comments: 'AD',
  };

  // Also map to CLIENT TRACKER columns (offset by 1 since BOOKED CLIENTS has originalRowNumber in Column A)
  const trackerColumnMap: Record<string, string> = {
    finalQuotation: 'AD',
    paymentsMade: 'AE',
    paymentDatesAD: 'AF',
    remainingPayment: 'AG',
    clientHandler: 'X',
    comments: 'AC',
  };

  // Update each field in both sheets
  for (const [field, value] of Object.entries(updates)) {
    const bookedColumn = columnMap[field];
    const trackerColumn = trackerColumnMap[field];
    
    if (bookedColumn && value !== undefined) {
      // Update BOOKED CLIENTS
      const bookedRange = encodeURIComponent(`'BOOKED CLIENTS'!${bookedColumn}${bookedRowNumber}`);
      const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}?valueInputOption=USER_ENTERED`;
      
      await fetch(bookedUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [[value]] }),
      });
      
      // Update CLIENT TRACKER
      if (trackerColumn && originalRowNumber >= 2) {
        const trackerRange = encodeURIComponent(`'CLIENT TRACKER'!${trackerColumn}${originalRowNumber}`);
        const trackerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerRange}?valueInputOption=USER_ENTERED`;
        
        await fetch(trackerUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [[value]] }),
        });
      }
    }
  }

  return { success: true };
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
      case 'updateClientQuotation':
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for updateClientQuotation');
        result = await updateClientQuotation(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.quotationData as string || ''
        );
        break;
      case 'updateClientMindset':
        if (!data || !data.rowNumber || !data.mindset) throw new Error('rowNumber and mindset are required for updateClientMindset');
        result = await updateClientMindset(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.mindset as string,
          data.clientTimestamp as string
        );
        break;
      case 'updateBargainingRates':
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for updateBargainingRates');
        result = await updateBargainingRates(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.ourRates as string || '',
          data.clientRates as string || ''
        );
        break;
      case 'updateClientBargainedRates':
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for updateClientBargainedRates');
        result = await updateClientBargainedRates(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.clientRates as string || ''
        );
        break;
      case 'addClientComment':
        if (!data || !data.rowNumber || !data.comment) throw new Error('rowNumber and comment are required for addClientComment');
        result = await addClientComment(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.comment as string,
          data.existingComments as string || '',
          data.clientTimestamp as string
        );
        break;
      case 'updateFinalQuotation':
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for updateFinalQuotation');
        result = await updateFinalQuotation(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.finalQuotation as string || ''
        );
        break;
      case 'updateOurCounterRates':
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for updateOurCounterRates');
        result = await updateOurCounterRates(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.ourRates as string || ''
        );
        break;
      case 'addPayment':
        if (!data || !data.rowNumber || !data.paymentAmount || !data.paymentType || !data.nepaliDate || !data.nepaliDateAD || !data.bank) {
          throw new Error('rowNumber, paymentAmount, paymentType, nepaliDate, nepaliDateAD, and bank are required for addPayment');
        }
        result = await addPayment(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.paymentAmount as string,
          data.paymentType as string,
          data.nepaliDate as string,
          data.nepaliDateAD as string,
          data.bank as string,
          data.existingPaymentsMade as string || '',
          data.existingPaymentDatesAD as string || '',
          data.finalQuotationAmount as number || 0
        );
        break;
      case 'getBookedClients':
        result = await getBookedClients(accessToken, spreadsheetId, body.limit);
        break;
      case 'migrateExistingBookedClients':
        result = await migrateExistingBookedClients(accessToken, spreadsheetId);
        break;
      case 'updateBookedClient':
        if (!data || !data.bookedRowNumber || !data.originalRowNumber) {
          throw new Error('bookedRowNumber and originalRowNumber are required for updateBookedClient');
        }
        result = await updateBookedClient(
          accessToken,
          spreadsheetId,
          data.bookedRowNumber as number,
          data.originalRowNumber as number,
          data.updates as Record<string, unknown> || {}
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
