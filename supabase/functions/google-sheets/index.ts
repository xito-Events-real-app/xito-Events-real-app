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
  action: 'getDropdowns' | 'getClients' | 'addClient' | 'updateClient' | 'searchClients' | 'testConnection' | 'getClientStatuses' | 'updateClientStatus' | 'addOldClient' | 'bulkUpdateStatus' | 'updateClientHandler' | 'logCallAttempt' | 'updateClientQuotation' | 'updateClientMindset' | 'updateBargainingRates' | 'updateClientBargainedRates' | 'updateOurCounterRates' | 'addClientComment' | 'updateFinalQuotation' | 'addPayment' | 'updatePayment' | 'getBookedClients' | 'migrateExistingBookedClients' | 'updateBookedClient' | 'resyncAllBookedClients' | 'fullResyncAllBookedClients' | 'getVendors' | 'addVendor' | 'updateVendor' | 'deleteVendor' | 'getVendorTypes' | 'getBookedEventDetails' | 'syncToEventDetails' | 'fullSyncEventDetails' | 'updateEventDetails' | 'getClientEventDetails' | 'updateClientEventDetails' | 'getAccounts' | 'addAccount' | 'getAccountSetupData' | 'getSecretsVendors' | 'addSecretsVendor' | 'getEventSetupData';
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
  const range = encodeURIComponent("'CLIENT TRACKER SETUP DATA'!A2:X100");
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
  if (!data.values) return { sources: [], whatsappOwners: [], clientLocations: [], eventLocations: [], teamMembers: [], oldClients: [], clientStatuses: [], mindsetOptions: [], paymentTypes: [], banks: [], companyNames: [], serviceTypes: [] };

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
    companyNames: getColumn(22),      // Column W - Company names
    serviceTypes: getColumn(23),      // Column X - Service types
  };
}

// Get all events from EVENT SETUP DATA sheet (Column A, starting from row 2)
async function getEventSetupData(accessToken: string, spreadsheetId: string) {
  const range = encodeURIComponent("'EVENT SETUP DATA'!A2:A500");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (getEventSetupData):', response.status, errorText);
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (!data.values) return [];
  
  // Extract event names from Column A, filter empty values
  return data.values.map((row: string[]) => row[0]).filter(Boolean);
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

// ============= ROW VERIFICATION HELPER =============
// Finds the correct row number in a sheet using registeredDateTimeAD (Column A) as unique identifier
// This prevents data corruption when row numbers shift due to new client insertions
async function verifyRowNumber(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  providedRowNumber: number,
  registeredDateTimeAD: string | undefined
): Promise<number> {
  // If no registeredDateTimeAD provided, use the provided row number as fallback
  if (!registeredDateTimeAD) return providedRowNumber;
  
  const range = encodeURIComponent(`'${sheetName}'!A2:A2000`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.values) {
        const normalizedId = registeredDateTimeAD.trim();
        for (let i = 0; i < data.values.length; i++) {
          if ((data.values[i][0] || '').trim() === normalizedId) {
            const actualRow = i + 2; // Row 2 is index 0
            if (actualRow !== providedRowNumber) {
              console.log(`[ROW VERIFY] ${sheetName}: Corrected row ${providedRowNumber} -> ${actualRow} for ID ${normalizedId.substring(0, 20)}...`);
            }
            return actualRow;
          }
        }
      }
    }
  } catch (error) {
    console.error(`[ROW VERIFY] Error looking up row in ${sheetName}:`, error);
  }
  
  return providedRowNumber; // Fallback to provided row number
}

// Update client status in Column W with timestamp log
async function updateClientStatus(accessToken: string, spreadsheetId: string, rowNumber: number, newStatus: string, existingStatusLog: string, clientTimestamp?: string, registeredDateTimeAD?: string) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating status');
  }

  // Verify and correct row number using registeredDateTimeAD
  const actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);

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

  const range = encodeURIComponent(`'CLIENT TRACKER'!W${actualRowNumber}`);
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
    // Fetch registeredDateTimeAD (Column A) for duplicate checking - this is the unique identifier
    const clientDataRange = encodeURIComponent(`'CLIENT TRACKER'!A${actualRowNumber}`);
    const clientDataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clientDataRange}`;
    const clientDataResponse = await fetch(clientDataUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    let fetchedRegisteredDateTime = '';
    if (clientDataResponse.ok) {
      const clientData = await clientDataResponse.json();
      if (clientData.values && clientData.values[0]) {
        fetchedRegisteredDateTime = clientData.values[0][0] || ''; // Column A - unique identifier
      }
    }
    
    const isAlreadyBooked = await checkIfAlreadyBooked(accessToken, spreadsheetId, fetchedRegisteredDateTime);
    if (!isAlreadyBooked) {
      await copyToBookedClients(accessToken, spreadsheetId, actualRowNumber);
      copiedToBooked = true;
      console.log(`Client at row ${actualRowNumber} copied to BOOKED CLIENTS`);
    }
  }

  return { success: true, statusLog: updatedLog, copiedToBooked, actualRowNumber };
}

// Get recent clients (now including Column W for status, Column X for handler, Column Y for call log, Column Z for mindset, AA/AB for bargaining, AC for comments, AD for final quotation, AE/AF/AG for payments, AH for company name, AI for service types)
async function getClients(accessToken: string, spreadsheetId: string, limit = 50) {
  const range = encodeURIComponent("'CLIENT TRACKER'!A2:AI" + (limit + 1));
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
    registeredDateTimeAD: row[0] || '',  // Column A
    registeredDateBS: row[1] || '',       // Column B
    clientName: row[2] || '',             // Column C
    source: row[3] || '',                 // Column D
    clientLocation: row[4] || '',         // Column E
    currentCountry: row[5] || '',         // Column F
    contactNo: row[6] || '',              // Column G
    whatsappNo: row[7] || '',             // Column H
    email: row[8] || '',                  // Column I - Email
    eventLocation: row[9] || '',          // Column J
    eventCity: row[10] || '',             // Column K
    events: row[11] || '',                // Column L
    eventYear: row[12] || '',             // Column M
    eventMonth: row[13] || '',            // Column N
    eventDay: row[14] || '',              // Column O
    eventDateAD: row[15] || '',           // Column P
    whoAdded: row[16] || '',              // Column Q
    inquiryDateAD: row[17] || '',         // Column R
    inquiryDateBS: row[18] || '',         // Column S
    inquiryTime: row[19] || '',           // Column T
    description: row[20] || '',           // Column U
    quotationData: row[21] || '',         // Column V - Quotation amounts
    statusLog: row[22] || '',             // Column W - Status log with timestamps
    clientHandler: row[23] || '',         // Column X - Client handler
    callLog: row[24] || '',               // Column Y - Call attempt history
    mindset: row[25] || '',               // Column Z - Mindset with timestamp
    ourBargainedRates: row[26] || '',     // Column AA - Our bargained rates
    clientBargainedRates: row[27] || '',  // Column AB - Client bargained rates
    comments: row[28] || '',              // Column AC - Client comments with timestamps
    finalQuotation: row[29] || '',        // Column AD - Final booked quotation
    paymentsMade: row[30] || '',          // Column AE - Payments made log
    paymentDatesAD: row[31] || '',        // Column AF - Payment dates in AD
    remainingPayment: row[32] || '',      // Column AG - Remaining payment
    companyName: row[33] || '',           // Column AH - Company name
    serviceTypes: row[34] || '',          // Column AI - Service types (multi, "/" separated)
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
  clientDate: string,
  registeredDateTimeAD?: string
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for logging call');
  }

  // Verify and correct row number using registeredDateTimeAD
  const actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);

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

  const range = encodeURIComponent(`'CLIENT TRACKER'!Y${actualRowNumber}`);
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

  return { success: true, callLog: updatedLog, actualRowNumber };
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
    '',                                      // Y: call_log (empty for new)
    '',                                      // Z: mindset (empty for new)
    '',                                      // AA: our_bargained_rates (empty for new)
    '',                                      // AB: client_bargained_rates (empty for new)
    '',                                      // AC: comments (empty for new)
    clientData.finalQuotation || '',       // AD: final_quotation
    '',                                      // AE: payments_made (empty for new)
    '',                                      // AF: payment_dates (empty for new)
    '',                                      // AG: remaining_payment (empty for new)
    clientData.companyName || '',            // AH: company_name
    clientData.serviceTypes || '',           // AI: service_types (multi, "/" separated)
  ]];

  const range = encodeURIComponent("'CLIENT TRACKER'!A2:AI2");
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  // If initial status is BOOKED, copy to BOOKED CLIENTS sheet
  if (selectedStatus.toUpperCase() === 'BOOKED') {
    console.log('[addClient] Status is BOOKED, copying to BOOKED CLIENTS sheet...');
    const isAlreadyBooked = await checkIfAlreadyBooked(accessToken, spreadsheetId, registeredDateTimeAD);
    if (!isAlreadyBooked) {
      await copyToBookedClients(accessToken, spreadsheetId, 2); // Row 2 is where we just inserted
      console.log('[addClient] Client copied to BOOKED CLIENTS sheet successfully');
    } else {
      console.log('[addClient] Client already exists in BOOKED CLIENTS, skipping copy');
    }
  }

  return response.json();
}

// Helper function to find a client row in BOOKED CLIENTS by registeredDateTimeAD
async function findBookedClientRow(
  accessToken: string, 
  spreadsheetId: string, 
  registeredDateTimeAD: string
): Promise<number | null> {
  const range = encodeURIComponent("'BOOKED CLIENTS'!A2:A2000");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) return null;
  
  const data = await response.json();
  const rows = data.values || [];
  const normalizedSearch = registeredDateTimeAD.trim();
  
  for (let i = 0; i < rows.length; i++) {
    const cellValue = (rows[i][0] || '').trim();
    if (cellValue === normalizedSearch) {
      return i + 2; // +2 for 1-indexed + header row
    }
  }
  return null;
}

// Update existing client
async function updateClient(accessToken: string, spreadsheetId: string, clientData: Record<string, unknown>) {
  const rowNumber = clientData.rowNumber as number;
  const registeredDateTimeAD = clientData.registeredDateTimeAD as string;
  
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating client');
  }

  // Verify and correct row number using registeredDateTimeAD
  const actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);

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

  const range = encodeURIComponent(`'CLIENT TRACKER'!A${actualRowNumber}:U${actualRowNumber}`);
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

  // After successful update to CLIENT TRACKER, sync to BOOKED CLIENTS if client exists there
  if (registeredDateTimeAD) {
    const bookedRowNumber = await findBookedClientRow(accessToken, spreadsheetId, registeredDateTimeAD);
    
    if (bookedRowNumber) {
      // Sync columns A:U (same data as CLIENT TRACKER update)
      const bookedRange = encodeURIComponent(`'BOOKED CLIENTS'!A${bookedRowNumber}:U${bookedRowNumber}`);
      const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}?valueInputOption=USER_ENTERED`;
      
      const bookedResponse = await fetch(bookedUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      });
      
      if (bookedResponse.ok) {
        console.log(`[updateClient] Synced to BOOKED CLIENTS row ${bookedRowNumber}`);
      } else {
        console.error(`[updateClient] Failed to sync to BOOKED CLIENTS:`, await bookedResponse.text());
      }
    }
  }

  return { success: true, actualRowNumber };
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
async function updateClientHandler(accessToken: string, spreadsheetId: string, rowNumber: number, handler: string, registeredDateTimeAD?: string) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating handler');
  }

  // Verify and correct row number using registeredDateTimeAD
  const actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);

  const range = encodeURIComponent(`'CLIENT TRACKER'!X${actualRowNumber}`);
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

  return { success: true, actualRowNumber };
}

// Update client quotation in Column V
async function updateClientQuotation(accessToken: string, spreadsheetId: string, rowNumber: number, quotationData: string, registeredDateTimeAD?: string) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating quotation');
  }

  // Verify and correct row number using registeredDateTimeAD
  const actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);

  const range = encodeURIComponent(`'CLIENT TRACKER'!V${actualRowNumber}`);
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

  return { success: true, actualRowNumber };
}

// Update client mindset in Column Z with timestamp
async function updateClientMindset(accessToken: string, spreadsheetId: string, rowNumber: number, mindset: string, clientTimestamp: string, registeredDateTimeAD?: string) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating mindset');
  }

  // Verify and correct row number using registeredDateTimeAD
  const actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);

  // Store as "MINDSET - MM/DD/YYYY, HH:MM:SS"
  const mindsetWithTimestamp = `${mindset} - ${clientTimestamp}`;

  const range = encodeURIComponent(`'CLIENT TRACKER'!Z${actualRowNumber}`);
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

  return { success: true, mindset: mindsetWithTimestamp, actualRowNumber };
}

// Add comment to Column AC with timestamp
async function addClientComment(
  accessToken: string,
  spreadsheetId: string,
  rowNumber: number,
  comment: string,
  existingComments: string,
  clientTimestamp: string,
  registeredDateTimeAD?: string
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for adding comment');
  }

  // Verify and correct row number using registeredDateTimeAD
  const actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);

  // Format: "[MM/DD/YYYY HH:MM] Comment text" - using ||| delimiter for multi-line support
  const newCommentEntry = `[${clientTimestamp}] ${comment}`;
  const updatedComments = existingComments 
    ? `${existingComments}|||${newCommentEntry}` 
    : newCommentEntry;

  const range = encodeURIComponent(`'CLIENT TRACKER'!AC${actualRowNumber}`);
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

  return { success: true, comments: updatedComments, actualRowNumber };
}

// Update bargaining rates in Columns AA (our rates) and AB (client rates)
async function updateBargainingRates(
  accessToken: string, 
  spreadsheetId: string, 
  rowNumber: number, 
  ourRates: string, 
  clientRates: string,
  registeredDateTimeAD?: string
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating bargaining rates');
  }

  // Verify and correct row number using registeredDateTimeAD
  const actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);

  // Update both columns in one batch
  const range = encodeURIComponent(`'CLIENT TRACKER'!AA${actualRowNumber}:AB${actualRowNumber}`);
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

  return { success: true, ourBargainedRates: ourRates, clientBargainedRates: clientRates, actualRowNumber };
}

// Update only client bargained rates in Column AB (for BARGAINING IS ON category)
async function updateClientBargainedRates(
  accessToken: string, 
  spreadsheetId: string, 
  rowNumber: number, 
  clientRates: string,
  registeredDateTimeAD?: string
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating client bargained rates');
  }

  // Verify and correct row number using registeredDateTimeAD
  const actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);

  // Update only Column AB
  const range = encodeURIComponent(`'CLIENT TRACKER'!AB${actualRowNumber}`);
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

  return { success: true, clientBargainedRates: clientRates, actualRowNumber };
}

// Update only our counter rates in Column AA (for BARGAINING IS ON category)
async function updateOurCounterRates(
  accessToken: string, 
  spreadsheetId: string, 
  rowNumber: number, 
  ourRates: string,
  registeredDateTimeAD?: string
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating our counter rates');
  }

  // Verify and correct row number using registeredDateTimeAD
  const actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);

  // Update only Column AA
  const range = encodeURIComponent(`'CLIENT TRACKER'!AA${actualRowNumber}`);
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

  return { success: true, ourBargainedRates: ourRates, actualRowNumber };
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

// Note: getCurrentStatusFromLog is defined below with checkIfAlreadyBooked

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
  finalQuotation: string,
  registeredDateTimeAD?: string
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating final quotation');
  }

  // Verify and correct row number using registeredDateTimeAD
  const actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);

  const range = encodeURIComponent(`'CLIENT TRACKER'!AD${actualRowNumber}`);
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

  return { success: true, finalQuotation, actualRowNumber };
}

// Add payment entry to Columns AE, AF, AG for BOOKED clients
// Now supports two-way sync: CLIENT TRACKER + BOOKED CLIENTS sheet
// Also syncs to INCOME WTN sheet in WTN INCOME & EXPENSES spreadsheet
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
  finalQuotationAmount: number,
  registeredDateTimeAD?: string, // Used to find matching row in BOOKED CLIENTS
  sourceSheet?: 'tracker' | 'booked', // Which sheet the payment is coming from
  clientName?: string // For income statement in WTN INCOME & EXPENSES
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
  // Format: "NPR 30,000/- AS ADVANCE ON SUN 2082-10-04 IN MASTER BARUN"
  // We extract the number between "NPR " and "/-" 
  const allPayments = updatedPaymentsMade.split('\n').filter(Boolean);
  let totalPaid = 0;
  for (const entry of allPayments) {
    // Match "NPR X,XXX/-" - extract the numeric value between NPR and /-
    // Also handles variations like "NPR 1000/-" or "NPR 1,00,000/-"
    const match = entry.match(/NPR\s*([\d,]+)\s*\/-/i);
    if (match) {
      totalPaid += parseInt(match[1].replace(/,/g, ''));
    } else {
      // Fallback: try to find any "NPR X" pattern
      const fallbackMatch = entry.match(/NPR\s*([\d,]+)/i);
      if (fallbackMatch) {
        totalPaid += parseInt(fallbackMatch[1].replace(/,/g, ''));
      }
    }
  }
  
  const remaining = finalQuotationAmount - totalPaid;
  const remainingFormatted = `NPR ${remaining.toLocaleString('en-IN')}/-`;
  
  const paymentValues = [[updatedPaymentsMade, updatedPaymentDatesAD, remainingFormatted]];
  
  // Determine primary and secondary sheets based on source
  const primarySheet = sourceSheet === 'booked' ? 'BOOKED CLIENTS' : 'CLIENT TRACKER';
  const secondarySheet = sourceSheet === 'booked' ? 'CLIENT TRACKER' : 'BOOKED CLIENTS';
  
  // Find the correct row in primary sheet using registeredDateTimeAD lookup
  // This ensures we update the correct row even if row numbers have shifted
  let actualRowNumber = rowNumber;
  
  if (registeredDateTimeAD) {
    try {
      const verifyRange = encodeURIComponent(`'${primarySheet}'!A2:A2000`);
      const verifyUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${verifyRange}`;
      
      const verifyResponse = await fetch(verifyUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        if (verifyData.values) {
          const normalizedDateTime = registeredDateTimeAD.trim();
          
          for (let i = 0; i < verifyData.values.length; i++) {
            const rowDateTime = (verifyData.values[i][0] || '').trim();
            if (rowDateTime === normalizedDateTime) {
              const foundRow = i + 2; // Row 2 is index 0
              if (foundRow !== rowNumber) {
                console.log(`[PRIMARY] Row correction: ${rowNumber} -> ${foundRow} for ${registeredDateTimeAD}`);
              }
              actualRowNumber = foundRow;
              break;
            }
          }
        }
      }
    } catch (lookupError) {
      console.error('Error looking up primary row, falling back to provided rowNumber:', lookupError);
    }
  }
  
  // Update primary sheet (the one the request came from) using verified row number
  const primaryRange = encodeURIComponent(`'${primarySheet}'!AE${actualRowNumber}:AG${actualRowNumber}`);
  const primaryUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${primaryRange}?valueInputOption=USER_ENTERED`;
  
  const primaryResponse = await fetch(primaryUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: paymentValues }),
  });

  if (!primaryResponse.ok) {
    const errorText = await primaryResponse.text();
    console.error(`Google Sheets API error (addPayment to ${primarySheet}):`, primaryResponse.status, errorText);
    throw new Error(`Failed to add payment: ${primaryResponse.status}`);
  }
  
  console.log(`[PRIMARY] Payment updated in ${primarySheet} row ${actualRowNumber} (original: ${rowNumber})`);

  // Two-way sync: Update the corresponding row in the other sheet
  if (registeredDateTimeAD) {
    try {
      // Find the matching row in the secondary sheet using registeredDateTimeAD
      const searchRange = encodeURIComponent(`'${secondarySheet}'!A2:A1000`);
      const searchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${searchRange}`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.values) {
          const normalizedDateTime = registeredDateTimeAD.trim();
          let matchingRowIndex = -1;
          
          for (let i = 0; i < searchData.values.length; i++) {
            const rowDateTime = (searchData.values[i][0] || '').trim();
            if (rowDateTime === normalizedDateTime) {
              matchingRowIndex = i;
              break;
            }
          }
          
          if (matchingRowIndex !== -1) {
            const secondaryRowNumber = matchingRowIndex + 2; // Row 2 is index 0
            const secondaryRange = encodeURIComponent(`'${secondarySheet}'!AE${secondaryRowNumber}:AG${secondaryRowNumber}`);
            const secondaryUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${secondaryRange}?valueInputOption=USER_ENTERED`;
            
            const secondaryResponse = await fetch(secondaryUrl, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ values: paymentValues }),
            });
            
            if (secondaryResponse.ok) {
              console.log(`Payment synced to ${secondarySheet} row ${secondaryRowNumber}`);
            } else {
              console.error(`Failed to sync payment to ${secondarySheet}:`, await secondaryResponse.text());
            }
          } else {
            console.log(`No matching row found in ${secondarySheet} for registeredDateTimeAD: ${registeredDateTimeAD}`);
          }
        }
      }
    } catch (syncError) {
      // Log but don't fail the primary update
      console.error('Error syncing payment to secondary sheet:', syncError);
    }
  }

  // Sync to INCOME WTN sheet in WTN INCOME & EXPENSES spreadsheet
  const incomeSpreadsheetId = Deno.env.get('WTN_INCOME_EXPENSES_SPREADSHEET_ID');
  if (incomeSpreadsheetId && clientName) {
    try {
      // Map payment type to income category
      const paymentTypeMap: Record<string, string> = {
        'ADVANCE': 'CLIENT ADVANCE',
        'PARTIAL': 'CLIENT PARTIAL PAYMENT',
        'FINAL': 'CLIENT FINAL PAYMENT',
      };
      const incomeCategory = paymentTypeMap[paymentType.toUpperCase()] || `CLIENT ${paymentType.toUpperCase()}`;
      
      // Build statement: "CLIENT NAME - PARTIAL AMOUNT PAID - NPR 75,000/-, REMAINING NPR 45,000/-"
      const paymentTypeLabel = paymentType.toUpperCase();
      const statement = `${clientName} - ${paymentTypeLabel} AMOUNT PAID - NPR ${parseInt(paymentAmount).toLocaleString('en-IN')}/-, REMAINING ${remainingFormatted}`;
      
      // Prepare row values: A=AD Date, B=BS Date, C=INCOME, D=Category, E=Amount, F=Bank, G=Statement
      const incomeRowValues = [[
        nepaliDateAD,              // Column A - AD Date
        nepaliDate,                // Column B - BS Date  
        'INCOME',                  // Column C - Type (static)
        incomeCategory,            // Column D - Payment category
        parseInt(paymentAmount),   // Column E - Amount (raw number)
        bank,                      // Column F - Bank/Payment Method
        statement                  // Column G - Statement
      ]];
      
      // Append to INCOME WTN sheet
      const incomeRange = encodeURIComponent("'INCOME WTN'!A:G");
      const incomeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${incomeSpreadsheetId}/values/${incomeRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      
      const incomeResponse = await fetch(incomeUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: incomeRowValues }),
      });
      
      if (incomeResponse.ok) {
        console.log(`Payment copied to INCOME WTN sheet for ${clientName}`);
      } else {
        console.error('Failed to copy payment to INCOME WTN:', await incomeResponse.text());
      }
    } catch (incomeError) {
      // Log but don't fail the primary update
      console.error('Error syncing payment to INCOME WTN:', incomeError);
    }
  }

  return { 
    success: true, 
    paymentsMade: updatedPaymentsMade, 
    paymentDatesAD: updatedPaymentDatesAD,
    remainingPayment: remainingFormatted,
    totalPaid
  };
}

// Update an existing payment entry at a specific index
async function updatePaymentEntry(
  accessToken: string,
  spreadsheetId: string,
  rowNumber: number,
  paymentIndex: number,
  newAmount: string,
  newType: string,
  newYear: string,
  newMonth: string,
  newDay: string,
  newBank: string,
  existingPaymentsMade: string,
  finalQuotationAmount: number,
  registeredDateTimeAD?: string
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating payment');
  }

  // Parse existing payments into array
  const paymentLines = existingPaymentsMade.split('\n').filter(line => line.trim());
  
  if (paymentIndex < 0 || paymentIndex >= paymentLines.length) {
    throw new Error(`Invalid payment index: ${paymentIndex}. Only ${paymentLines.length} payments exist.`);
  }

  // Get weekday for the date
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  let weekday = 'SAT'; // Default
  try {
    // Create a Nepali date and convert to get the weekday
    // We'll approximate using the current day since we don't have full conversion in Deno
    const currentDate = new Date();
    weekday = dayNames[currentDate.getDay()];
  } catch (e) {
    console.log('Using default weekday');
  }

  // Format month with leading zero
  const monthPadded = newMonth.padStart(2, '0');
  const dayPadded = newDay.padStart(2, '0');
  const nepaliDateFormatted = `${newYear}-${monthPadded}-${dayPadded}`;
  
  // Format amount with commas
  const amountNum = parseInt(newAmount.replace(/,/g, ''), 10);
  const amountFormatted = amountNum.toLocaleString('en-IN');

  // Create new payment line: "NPR X,XXX/- AS TYPE ON WEEKDAY YYYY-MM-DD IN BANK"
  const newPaymentLine = `NPR ${amountFormatted}/- AS ${newType.toUpperCase()} ON ${weekday} ${nepaliDateFormatted} IN ${newBank.toUpperCase()}`;
  
  // Replace the payment at the specified index
  paymentLines[paymentIndex] = newPaymentLine;
  const updatedPaymentsMade = paymentLines.join('\n');
  
  // Recalculate total paid
  let totalPaid = 0;
  paymentLines.forEach(entry => {
    const match = entry.match(/NPR\s*([\d,]+)/);
    if (match) {
      totalPaid += parseInt(match[1].replace(/,/g, ''), 10);
    }
  });
  
  // Calculate remaining
  const remaining = Math.max(0, finalQuotationAmount - totalPaid);
  const remainingFormatted = `NPR ${remaining.toLocaleString('en-IN')}/-`;

  // Create payment values array [paymentsMade, '', remainingPayment] 
  // Note: We're not updating paymentDatesAD (column AF) for simplicity
  const paymentValues = [[updatedPaymentsMade, '', remainingFormatted]];

  // Determine which sheet to update - for booked clients, update BOOKED CLIENTS first
  // We'll update both sheets using registeredDateTimeAD as the key
  
  // Update BOOKED CLIENTS sheet first
  const actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'BOOKED CLIENTS', rowNumber, registeredDateTimeAD);
  
  const bookedRange = encodeURIComponent(`'BOOKED CLIENTS'!AE${actualRowNumber}:AG${actualRowNumber}`);
  const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}?valueInputOption=USER_ENTERED`;
  
  const bookedResponse = await fetch(bookedUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: paymentValues }),
  });

  if (!bookedResponse.ok) {
    const errorText = await bookedResponse.text();
    console.error('Google Sheets API error (updatePayment to BOOKED CLIENTS):', bookedResponse.status, errorText);
    throw new Error(`Failed to update payment: ${bookedResponse.status}`);
  }
  
  console.log(`[UPDATE PAYMENT] Updated BOOKED CLIENTS row ${actualRowNumber}`);

  // Two-way sync: Update CLIENT TRACKER
  if (registeredDateTimeAD) {
    try {
      const searchRange = encodeURIComponent(`'CLIENT TRACKER'!A2:A2000`);
      const searchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${searchRange}`;
      
      const searchResponse = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        if (searchData.values) {
          const normalizedDateTime = registeredDateTimeAD.trim();
          let matchingRowIndex = -1;
          
          for (let i = 0; i < searchData.values.length; i++) {
            const rowDateTime = (searchData.values[i][0] || '').trim();
            if (rowDateTime === normalizedDateTime) {
              matchingRowIndex = i;
              break;
            }
          }
          
          if (matchingRowIndex !== -1) {
            const trackerRowNumber = matchingRowIndex + 2;
            const trackerRange = encodeURIComponent(`'CLIENT TRACKER'!AE${trackerRowNumber}:AG${trackerRowNumber}`);
            const trackerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerRange}?valueInputOption=USER_ENTERED`;
            
            const trackerResponse = await fetch(trackerUrl, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ values: paymentValues }),
            });
            
            if (trackerResponse.ok) {
              console.log(`[UPDATE PAYMENT] Synced to CLIENT TRACKER row ${trackerRowNumber}`);
            } else {
              console.error(`[UPDATE PAYMENT] Failed to sync to CLIENT TRACKER:`, await trackerResponse.text());
            }
          }
        }
      }
    } catch (syncError) {
      console.error('[UPDATE PAYMENT] Error syncing to CLIENT TRACKER:', syncError);
    }
  }

  return { 
    success: true, 
    paymentsMade: updatedPaymentsMade, 
    remainingPayment: remainingFormatted,
  };
}

// Check if a client is already in the BOOKED CLIENTS sheet using registeredDateTimeAD (Column A) as unique identifier
async function checkIfAlreadyBooked(accessToken: string, spreadsheetId: string, registeredDateTimeAD: string): Promise<boolean> {
  const range = encodeURIComponent("'BOOKED CLIENTS'!A2:A1000"); // Column A - registeredDateTimeAD
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
    
    // Check if any row has this exact registeredDateTimeAD (Column A is the unique identifier)
    const normalizedDateTime = registeredDateTimeAD.trim();
    
    return data.values.some((row: string[]) => {
      const rowDateTime = (row[0] || '').trim();
      return rowDateTime === normalizedDateTime;
    });
  } catch (error) {
    console.error('Error checking if already booked:', error);
    return false;
  }
}

// Helper to get current status from status log (handles multiple formats)
function getCurrentStatusFromLog(statusLog: string): string {
  if (!statusLog) return 'UNTOUCHED';
  const lines = statusLog.split('\n').filter(Boolean);
  if (lines.length === 0) return 'UNTOUCHED';
  
  // Get the last line for the current status
  const lastLine = lines[lines.length - 1].trim().toUpperCase();
  
  // Check for "BOOKED SOMEWHERE ELSE" first - this is NOT the same as "BOOKED"
  if (lastLine.startsWith('BOOKED SOMEWHERE ELSE')) {
    return 'BOOKED SOMEWHERE ELSE';
  }
  
  // Check for exact "BOOKED" status (with optional timestamp/separator after)
  // Matches: "BOOKED", "BOOKED - timestamp", "BOOKED [timestamp]", "BOOKED: note"
  // Does NOT match: "BOOKED SOMEWHERE ELSE"
  if (lastLine.match(/^BOOKED(?:\s*[-\[\(:,]|$)/)) {
    return 'BOOKED';
  }
  
  // Try format: "STATUS - timestamp" (e.g., "CANCELLED - 01/15/2026, 10:30:00")
  const dashMatch = lastLine.match(/^([A-Z\s]+?)\s*-\s*/);
  if (dashMatch) return dashMatch[1].trim();
  
  // Try format: "STATUS [timestamp]" (e.g., "CANCELLED [2026-01-15 10:30:00]")
  const bracketMatch = lastLine.match(/^([A-Z\s]+?)\s*\[/);
  if (bracketMatch) return bracketMatch[1].trim();
  
  // Fallback: return the first word as status
  const firstWord = lastLine.split(/[\s\-\[\(]/)[0];
  return firstWord || 'UNTOUCHED';
}

// Copy a client from CLIENT TRACKER to BOOKED CLIENTS sheet (same column structure as CLIENT TRACKER)
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

  // Prepare the data for BOOKED CLIENTS - EXACT same structure as CLIENT TRACKER (A-AG)
  // No extra columns - direct copy of all CLIENT TRACKER data
  const bookedValues = [[
    clientRow[0] || '',   // A: Registered DateTime AD
    clientRow[1] || '',   // B: Registered Date BS
    clientRow[2] || '',   // C: Client Name
    clientRow[3] || '',   // D: Source
    clientRow[4] || '',   // E: Client Location
    clientRow[5] || '',   // F: Current Country
    clientRow[6] || '',   // G: Contact No
    clientRow[7] || '',   // H: WhatsApp No
    clientRow[8] || '',   // I: (empty)
    clientRow[9] || '',   // J: Event Location
    clientRow[10] || '',  // K: Event City
    clientRow[11] || '',  // L: Events
    clientRow[12] || '',  // M: Event Year
    clientRow[13] || '',  // N: Event Month
    clientRow[14] || '',  // O: Event Day
    clientRow[15] || '',  // P: Event Date AD
    clientRow[16] || '',  // Q: Who Added
    clientRow[17] || '',  // R: Inquiry Date AD
    clientRow[18] || '',  // S: Inquiry Date BS
    clientRow[19] || '',  // T: Inquiry Time
    clientRow[20] || '',  // U: Description
    clientRow[21] || '',  // V: Quotation Data
    clientRow[22] || '',  // W: Status Log
    clientRow[23] || '',  // X: Client Handler
    clientRow[24] || '',  // Y: Call Log
    clientRow[25] || '',  // Z: Mindset
    clientRow[26] || '',  // AA: Our Bargained Rates
    clientRow[27] || '',  // AB: Client Bargained Rates
    clientRow[28] || '',  // AC: Comments
    clientRow[29] || '',  // AD: Final Quotation
    clientRow[30] || '',  // AE: Payments Made
    clientRow[31] || '',  // AF: Payment Dates AD
    clientRow[32] || '',  // AG: Remaining Payment
  ]];

  // Write the data to row 2 of BOOKED CLIENTS (same structure as CLIENT TRACKER: A-AG)
  const writeRange = encodeURIComponent("'BOOKED CLIENTS'!A2:AG2");
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
  
  // Also copy to EVENT DETAILS sheet
  const registeredDateTimeAD = clientRow[0] || '';
  if (registeredDateTimeAD) {
    try {
      await copyToEventDetails(accessToken, spreadsheetId, clientRow);
      console.log(`Successfully copied client to BOOKED CLIENTS EVENT DETAILS`);
    } catch (eventError) {
      console.error('Failed to copy to EVENT DETAILS (non-critical):', eventError);
    }
  }
  
  return { success: true };
}

// ============= BOOKED CLIENTS EVENT DETAILS FUNCTIONS =============

// Check if client already exists in EVENT DETAILS sheet
async function checkIfExistsInEventDetails(accessToken: string, spreadsheetId: string, registeredDateTimeAD: string): Promise<number | null> {
  const range = encodeURIComponent("'BOOKED CLIENTS EVENT DETAILS'!A2:A1000");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.log('BOOKED CLIENTS EVENT DETAILS sheet may not exist');
      return null;
    }

    const data = await response.json();
    if (!data.values) return null;
    
    const normalizedDateTime = registeredDateTimeAD.trim();
    for (let i = 0; i < data.values.length; i++) {
      const rowDateTime = (data.values[i][0] || '').trim();
      if (rowDateTime === normalizedDateTime) {
        return i + 2; // Return row number (1-indexed, skip header)
      }
    }
    return null;
  } catch (error) {
    console.error('Error checking EVENT DETAILS:', error);
    return null;
  }
}

// Copy a client to BOOKED CLIENTS EVENT DETAILS sheet
// Column mapping: A-C (same), L-P -> D-H, J-AH are empty for user input
async function copyToEventDetails(accessToken: string, spreadsheetId: string, clientRow: string[]) {
  const registeredDateTimeAD = (clientRow[0] || '').trim();
  if (!registeredDateTimeAD) {
    throw new Error('registeredDateTimeAD is required for copying to EVENT DETAILS');
  }
  
  // Check if already exists
  const existingRow = await checkIfExistsInEventDetails(accessToken, spreadsheetId, registeredDateTimeAD);
  if (existingRow) {
    console.log(`Client already exists in EVENT DETAILS at row ${existingRow}, skipping`);
    return { success: true, alreadyExists: true, rowNumber: existingRow };
  }
  
  // Get sheet ID for inserting new row
  const sheetId = await getSheetId(accessToken, spreadsheetId, 'BOOKED CLIENTS EVENT DETAILS');
  
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
            startIndex: 1,
            endIndex: 2,
          },
          inheritFromBefore: false,
        },
      }],
    }),
  });
  
  // Map columns from BOOKED CLIENTS to EVENT DETAILS:
  // A-C (same): registeredDateTimeAD, registeredDateBS, clientName
  // L-P -> D-H: events, eventYear, eventMonth, eventDay, eventDateAD
  const eventDetailsValues = [[
    clientRow[0] || '',   // A: registeredDateTimeAD (same)
    clientRow[1] || '',   // B: registeredDateBS (same)
    clientRow[2] || '',   // C: clientName (same)
    clientRow[11] || '',  // D: events (from L)
    clientRow[12] || '',  // E: eventYear (from M)
    clientRow[13] || '',  // F: eventMonth (from N)
    clientRow[14] || '',  // G: eventDay (from O)
    clientRow[15] || '',  // H: eventDateAD (from P)
    '',                   // I: empty/reserved separator
    // J-AH are empty - user input columns
  ]];
  
  const writeRange = encodeURIComponent("'BOOKED CLIENTS EVENT DETAILS'!A2:I2");
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`;
  
  const writeResponse = await fetch(writeUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: eventDetailsValues }),
  });

  if (!writeResponse.ok) {
    const errorText = await writeResponse.text();
    console.error('Error writing to EVENT DETAILS:', errorText);
    throw new Error(`Failed to copy to EVENT DETAILS: ${writeResponse.status}`);
  }

  return { success: true, alreadyExists: false };
}

// Get all event details from BOOKED CLIENTS EVENT DETAILS sheet
async function getBookedEventDetails(accessToken: string, spreadsheetId: string, limit = 200) {
  const range = encodeURIComponent("'BOOKED CLIENTS EVENT DETAILS'!A2:AH" + (limit + 1));
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (getBookedEventDetails):', response.status, errorText);
    throw new Error(`Google Sheets API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.values) return [];

  return data.values.map((row: string[], index: number) => ({
    rowNumber: index + 2,
    registeredDateTimeAD: row[0] || '',   // A
    registeredDateBS: row[1] || '',       // B
    clientName: row[2] || '',             // C
    events: row[3] || '',                 // D (from L)
    eventYear: row[4] || '',              // E (from M)
    eventMonth: row[5] || '',             // F (from N)
    eventDay: row[6] || '',               // G (from O)
    eventDateAD: row[7] || '',            // H (from P)
    // Column I is empty/reserved
    venueType: row[9] || '',              // J
    venueName: row[10] || '',             // K
    venueCity: row[11] || '',             // L
    venueArea: row[12] || '',             // M
    venueMap: row[13] || '',              // N
    eventStartTime: row[14] || '',        // O
    eventEndTime: row[15] || '',          // P
    parlourType: row[16] || '',           // Q
    parlourName: row[17] || '',           // R
    parlourCity: row[18] || '',           // S
    parlourArea: row[19] || '',           // T
    parlourMap: row[20] || '',            // U
    parlourStartTime: row[21] || '',      // V
    parlourEndTime: row[22] || '',        // W
    preShootVenueType: row[23] || '',     // X
    preShootVenueName: row[24] || '',     // Y
    preShootVenueCity: row[25] || '',     // Z
    preShootVenueArea: row[26] || '',     // AA
    preShootVenueMap: row[27] || '',      // AB
    preShootStartTime: row[28] || '',     // AC
    preShootEndTime: row[29] || '',       // AD
    doGroomComeInMehndi: row[30] || '',   // AE
    noOfGuest: row[31] || '',             // AF
    eventDemand: row[32] || '',           // AG
    eventReferences: row[33] || '',       // AH
  }));
}

// Sync a single client to EVENT DETAILS (used when status changes to BOOKED)
async function syncToEventDetails(accessToken: string, spreadsheetId: string, registeredDateTimeAD: string) {
  // Fetch the client data from BOOKED CLIENTS by registeredDateTimeAD
  const range = encodeURIComponent("'BOOKED CLIENTS'!A2:P1000");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch BOOKED CLIENTS data');
  }

  const data = await response.json();
  if (!data.values) {
    throw new Error('No BOOKED CLIENTS data found');
  }

  // Find the matching client
  const normalizedDateTime = registeredDateTimeAD.trim();
  for (const row of data.values) {
    const rowDateTime = (row[0] || '').trim();
    if (rowDateTime === normalizedDateTime) {
      // Found - copy to EVENT DETAILS
      await copyToEventDetails(accessToken, spreadsheetId, row);
      return { success: true };
    }
  }

  throw new Error('Client not found in BOOKED CLIENTS');
}

// Full sync: Copy all missing clients from BOOKED CLIENTS to EVENT DETAILS
// Also update columns A-C and D-H for existing entries (preserving J-AH user data)
async function fullSyncEventDetails(accessToken: string, spreadsheetId: string) {
  // 1. Fetch all BOOKED CLIENTS data
  const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:P2000");
  const bookedResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!bookedResponse.ok) {
    throw new Error('Failed to fetch BOOKED CLIENTS data');
  }

  const bookedData = await bookedResponse.json();
  if (!bookedData.values || bookedData.values.length === 0) {
    return { success: true, copiedCount: 0, updatedCount: 0, totalEvents: 0 };
  }

  // 2. Fetch all existing EVENT DETAILS entries
  const eventRange = encodeURIComponent("'BOOKED CLIENTS EVENT DETAILS'!A2:H2000");
  const eventResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${eventRange}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  let existingEventMap: Record<string, number> = {};
  if (eventResponse.ok) {
    const eventData = await eventResponse.json();
    if (eventData.values) {
      eventData.values.forEach((row: string[], index: number) => {
        const regDateTime = (row[0] || '').trim();
        if (regDateTime) {
          existingEventMap[regDateTime] = index + 2; // Row number
        }
      });
    }
  }

  let copiedCount = 0;
  let updatedCount = 0;

  // 3. Process each booked client
  for (const row of bookedData.values) {
    const registeredDateTimeAD = (row[0] || '').trim();
    if (!registeredDateTimeAD) continue;

    const existingRowNumber = existingEventMap[registeredDateTimeAD];
    
    if (existingRowNumber) {
      // Update existing: Only update columns A-C and D-H (preserve J-AH)
      const updateValues = [[
        row[0] || '',   // A: registeredDateTimeAD
        row[1] || '',   // B: registeredDateBS
        row[2] || '',   // C: clientName
        row[11] || '',  // D: events (from L)
        row[12] || '',  // E: eventYear (from M)
        row[13] || '',  // F: eventMonth (from N)
        row[14] || '',  // G: eventDay (from O)
        row[15] || '',  // H: eventDateAD (from P)
      ]];
      
      const updateRange = encodeURIComponent(`'BOOKED CLIENTS EVENT DETAILS'!A${existingRowNumber}:H${existingRowNumber}`);
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
      
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: updateValues }),
      });

      if (updateResponse.ok) {
        updatedCount++;
      }
    } else {
      // Copy new entry
      try {
        await copyToEventDetails(accessToken, spreadsheetId, row);
        copiedCount++;
      } catch (copyError) {
        console.error(`Failed to copy client ${registeredDateTimeAD}:`, copyError);
      }
    }
  }

  return { 
    success: true, 
    copiedCount, 
    updatedCount, 
    totalEvents: bookedData.values.length 
  };
}

// Update specific event detail columns (J-AH) for a client
async function updateEventDetails(
  accessToken: string, 
  spreadsheetId: string, 
  rowNumber: number,
  updates: Record<string, string>
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating event details');
  }

  // Build update array for columns J-AH (indices 9-33)
  const updateValues = [[
    updates.venueType || '',              // J (index 9)
    updates.venueName || '',              // K
    updates.venueCity || '',              // L
    updates.venueArea || '',              // M
    updates.venueMap || '',               // N
    updates.eventStartTime || '',         // O
    updates.eventEndTime || '',           // P
    updates.parlourType || '',            // Q
    updates.parlourName || '',            // R
    updates.parlourCity || '',            // S
    updates.parlourArea || '',            // T
    updates.parlourMap || '',             // U
    updates.parlourStartTime || '',       // V
    updates.parlourEndTime || '',         // W
    updates.preShootVenueType || '',      // X
    updates.preShootVenueName || '',      // Y
    updates.preShootVenueCity || '',      // Z
    updates.preShootVenueArea || '',      // AA
    updates.preShootVenueMap || '',       // AB
    updates.preShootStartTime || '',      // AC
    updates.preShootEndTime || '',        // AD
    updates.doGroomComeInMehndi || '',    // AE
    updates.noOfGuest || '',              // AF
    updates.eventDemand || '',            // AG
    updates.eventReferences || '',        // AH
  ]];

  const range = encodeURIComponent(`'BOOKED CLIENTS EVENT DETAILS'!J${rowNumber}:AH${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: updateValues }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (updateEventDetails):', response.status, errorText);
    throw new Error(`Failed to update event details: ${response.status}`);
  }

  return { success: true };
}

// ============= NEW: GET CLIENT EVENT DETAILS BY registeredDateTimeAD =============
// Returns event details parsed by event index for multi-event clients
async function getClientEventDetails(accessToken: string, spreadsheetId: string, registeredDateTimeAD: string) {
  // Find the row in EVENT DETAILS by registeredDateTimeAD
  const range = encodeURIComponent("'BOOKED CLIENTS EVENT DETAILS'!A2:AH500");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch event details');
  }

  const data = await response.json();
  if (!data.values) {
    throw new Error('No event details data found');
  }

  // Find the matching client row
  const normalizedId = registeredDateTimeAD.trim();
  let foundRow: string[] | null = null;
  let rowNumber = 0;
  
  for (let i = 0; i < data.values.length; i++) {
    const rowId = (data.values[i][0] || '').trim();
    if (rowId === normalizedId) {
      foundRow = data.values[i];
      rowNumber = i + 2;
      break;
    }
  }

  if (!foundRow) {
    throw new Error('Client not found in EVENT DETAILS sheet');
  }

  // Parse multi-line columns to build event-indexed data
  // Columns: D=events (3), E=year (4), F=month (5), G=day (6), H=dateAD (7)
  // J-AH for logistics (9-33)
  const eventNames = (foundRow[3] || '').split('\n');
  const eventYears = (foundRow[4] || '').split('\n');
  const eventMonths = (foundRow[5] || '').split('\n');
  const eventDays = (foundRow[6] || '').split('\n');
  const eventDatesAD = (foundRow[7] || '').split('\n');
  
  // Logistics columns (J-AH, indices 9-33)
  const venueTypes = (foundRow[9] || '').split('\n');
  const venueNames = (foundRow[10] || '').split('\n');
  const venueCities = (foundRow[11] || '').split('\n');
  const venueAreas = (foundRow[12] || '').split('\n');
  const venueMaps = (foundRow[13] || '').split('\n');
  const eventStartTimes = (foundRow[14] || '').split('\n');
  const eventEndTimes = (foundRow[15] || '').split('\n');
  const parlourTypes = (foundRow[16] || '').split('\n');
  const parlourNames = (foundRow[17] || '').split('\n');
  const parlourCities = (foundRow[18] || '').split('\n');
  const parlourAreas = (foundRow[19] || '').split('\n');
  const parlourMaps = (foundRow[20] || '').split('\n');
  const parlourStartTimes = (foundRow[21] || '').split('\n');
  const parlourEndTimes = (foundRow[22] || '').split('\n');
  // Skip X-AD (indices 23-29 - preShoot fields not used)
  const doGroomInMehndiArr = (foundRow[30] || '').split('\n');
  const guestCounts = (foundRow[31] || '').split('\n');
  const eventDemandsArr = (foundRow[32] || '').split('\n');
  const eventReferencesArr = (foundRow[33] || '').split('\n');

  // Helper to parse quoted list
  function parseQuotedList(value: string): string[] {
    if (!value) return [];
    const matches = value.match(/"([^"]*)"/g);
    return matches ? matches.map(m => m.replace(/"/g, '')) : [];
  }

  // Build events array - filter empty names but preserve ORIGINAL line index
  const events = [];
  
  for (let i = 0; i < eventNames.length; i++) {
    const name = eventNames[i]?.trim();
    if (!name) continue; // Skip empty event names in display
    
    events.push({
      eventIndex: i,  // This is the ACTUAL sheet line index, not the display order
      eventName: name,
      eventYear: eventYears[i] || '',
      eventMonth: eventMonths[i] || '',
      eventDay: eventDays[i] || '',
      eventDateAD: eventDatesAD[i] || '',
      venueType: venueTypes[i] || '',
      venueName: venueNames[i] || '',
      venueCity: venueCities[i] || '',
      venueArea: venueAreas[i] || '',
      venueMap: venueMaps[i] || '',
      eventStartTime: eventStartTimes[i] || '',
      eventEndTime: eventEndTimes[i] || '',
      parlourType: parlourTypes[i] || '',
      parlourName: parlourNames[i] || '',
      parlourCity: parlourCities[i] || '',
      parlourArea: parlourAreas[i] || '',
      parlourMap: parlourMaps[i] || '',
      parlourStartTime: parlourStartTimes[i] || '',
      parlourEndTime: parlourEndTimes[i] || '',
      doGroomComeInMehndi: doGroomInMehndiArr[i] || '',
      guestCount: guestCounts[i] || '',
      eventDemands: parseQuotedList(eventDemandsArr[i] || ''),
      eventReferences: parseQuotedList(eventReferencesArr[i] || ''),
    });
  }

  return { rowNumber, events };
}

// ============= NEW: UPDATE CLIENT EVENT DETAILS FOR SPECIFIC EVENT INDEX =============
// Updates logistics columns (J-AH) for a specific event line, preserving other lines
async function updateClientEventDetails(
  accessToken: string,
  spreadsheetId: string,
  registeredDateTimeAD: string,
  eventIndex: number,
  updates: Record<string, string>
) {
  // First find the row and get existing data
  const range = encodeURIComponent("'BOOKED CLIENTS EVENT DETAILS'!A2:AH500");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch event details for update');
  }

  const data = await response.json();
  if (!data.values) {
    throw new Error('No event details data found');
  }

  // Find the matching client row
  const normalizedId = registeredDateTimeAD.trim();
  let foundRowIndex = -1;
  let rowNumber = 0;
  
  for (let i = 0; i < data.values.length; i++) {
    const rowId = (data.values[i][0] || '').trim();
    if (rowId === normalizedId) {
      foundRowIndex = i;
      rowNumber = i + 2;
      break;
    }
  }

  if (foundRowIndex === -1 || rowNumber === 0) {
    throw new Error('Client not found in EVENT DETAILS sheet for update');
  }

  const existingRow = data.values[foundRowIndex];

  // Helper to update a specific line in a multi-line value
  function updateLineAtIndex(existing: string, idx: number, newValue: string): string {
    const lines = existing ? existing.split('\n') : [];
    // Pad array if needed
    while (lines.length <= idx) {
      lines.push('');
    }
    lines[idx] = newValue;
    return lines.join('\n');
  }

  // Build updated values for columns J-AH (indices 9-33)
  // Map field names to column indices
  const fieldToIndex: Record<string, number> = {
    venueType: 9,
    venueName: 10,
    venueCity: 11,
    venueArea: 12,
    venueMap: 13,
    eventStartTime: 14,
    eventEndTime: 15,
    parlourType: 16,
    parlourName: 17,
    parlourCity: 18,
    parlourArea: 19,
    parlourMap: 20,
    parlourStartTime: 21,
    parlourEndTime: 22,
    // Skip X-AD (23-29)
    doGroomComeInMehndi: 30,
    guestCount: 31,
    eventDemands: 32,
    eventReferences: 33,
  };

  // Build the update array (J to AH = indices 9-33, 25 columns)
  const updateValues: string[] = [];
  
  for (let colIdx = 9; colIdx <= 33; colIdx++) {
    const fieldName = Object.entries(fieldToIndex).find(([_, idx]) => idx === colIdx)?.[0];
    const existingValue = existingRow[colIdx] || '';
    
    if (fieldName && updates[fieldName] !== undefined) {
      // This field is being updated
      updateValues.push(updateLineAtIndex(existingValue, eventIndex, updates[fieldName]));
    } else {
      // Keep existing value
      updateValues.push(existingValue);
    }
  }

  // Write updated values back to columns J-AH
  const updateRange = encodeURIComponent(`'BOOKED CLIENTS EVENT DETAILS'!J${rowNumber}:AH${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
  
  const updateResponse = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [updateValues] }),
  });

  if (!updateResponse.ok) {
    const errorText = await updateResponse.text();
    console.error('Google Sheets API error (updateClientEventDetails):', updateResponse.status, errorText);
    throw new Error(`Failed to update event details: ${updateResponse.status}`);
  }

  return { success: true };
}

// Get all clients from BOOKED CLIENTS sheet (same structure as CLIENT TRACKER: A-AG)
// Now includes a lookup to resolve originalRowNumber from CLIENT TRACKER
async function getBookedClients(accessToken: string, spreadsheetId: string, limit = 100) {
  // 1. Fetch booked clients data
  const range = encodeURIComponent("'BOOKED CLIENTS'!A2:AG" + (limit + 1));
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

  // 2. Fetch CLIENT TRACKER registeredDateTimeAD column (Column A) for lookup
  const trackerRange = encodeURIComponent("'CLIENT TRACKER'!A2:A2000");
  const trackerResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerRange}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  // 3. Build a lookup map: registeredDateTimeAD -> rowNumber in CLIENT TRACKER
  const rowLookup: Record<string, number> = {};
  if (trackerResponse.ok) {
    const trackerData = await trackerResponse.json();
    if (trackerData.values) {
      trackerData.values.forEach((row: string[], index: number) => {
        const regDateTime = (row[0] || '').trim();
        if (regDateTime) {
          rowLookup[regDateTime] = index + 2; // Row numbers start at 2
        }
      });
    }
  }

  // 4. Map booked clients with resolved originalRowNumber
  return data.values.map((row: string[], index: number) => {
    const registeredDateTimeAD = (row[0] || '').trim();
    return {
      bookedRowNumber: index + 2,
      originalRowNumber: rowLookup[registeredDateTimeAD] || 0, // Resolved from CLIENT TRACKER!
      registeredDateTimeAD,                 // Column A - unique identifier
      registeredDateBS: row[1] || '',       // Column B
      clientName: row[2] || '',             // Column C
      source: row[3] || '',                 // Column D
      clientLocation: row[4] || '',         // Column E
      currentCountry: row[5] || '',         // Column F
      contactNo: row[6] || '',              // Column G
      whatsappNo: row[7] || '',             // Column H
      email: row[8] || '',                  // Column I - Email
      eventLocation: row[9] || '',          // Column J
      eventCity: row[10] || '',             // Column K
      events: row[11] || '',                // Column L
      eventYear: row[12] || '',             // Column M
      eventMonth: row[13] || '',            // Column N
      eventDay: row[14] || '',              // Column O
      eventDateAD: row[15] || '',           // Column P
      whoAdded: row[16] || '',              // Column Q
      inquiryDateAD: row[17] || '',         // Column R
      inquiryDateBS: row[18] || '',         // Column S
      inquiryTime: row[19] || '',           // Column T
      description: row[20] || '',           // Column U
      quotationData: row[21] || '',         // Column V
      statusLog: row[22] || '',             // Column W
      clientHandler: row[23] || '',         // Column X
      callLog: row[24] || '',               // Column Y
      mindset: row[25] || '',               // Column Z
      ourBargainedRates: row[26] || '',     // Column AA
      clientBargainedRates: row[27] || '',  // Column AB
      comments: row[28] || '',              // Column AC
      finalQuotation: row[29] || '',        // Column AD
      paymentsMade: row[30] || '',          // Column AE
      paymentDatesAD: row[31] || '',        // Column AF
      remainingPayment: row[32] || '',      // Column AG
      bookedDateTime: '',                   // Not stored separately
    };
  });
}

// Migrate existing BOOKED clients from CLIENT TRACKER to BOOKED CLIENTS
async function migrateExistingBookedClients(accessToken: string, spreadsheetId: string) {
  // Get ALL clients from CLIENT TRACKER (up to 2000 to ensure we don't miss any)
  const clients = await getClients(accessToken, spreadsheetId, 2000);
  
  console.log(`Migration: Checking ${clients.length} clients for BOOKED status`);
  
  let migratedCount = 0;
  let alreadyExistsCount = 0;
  let skippedCount = 0;
  
  for (const client of clients) {
    const statusLog = client.statusLog || '';
    const currentStatus = getCurrentStatusFromLog(statusLog);
    
    // Debug: Log any client whose status log contains "BOOKED" anywhere
    if (statusLog.toUpperCase().includes('BOOKED')) {
      console.log(`[DEBUG] Client "${client.clientName}" (row ${client.rowNumber}) - Detected status: "${currentStatus}" - StatusLog preview: "${statusLog.substring(0, 80).replace(/\n/g, ' | ')}"`);
    }
    
    // Check if client is BOOKED
    if (currentStatus === 'BOOKED') {
      // Check if already in BOOKED CLIENTS using registeredDateTimeAD as unique ID
      const registeredDateTime = (client.registeredDateTimeAD || '').trim();
      
      if (!registeredDateTime) {
        console.log(`[SKIP] Client "${client.clientName}" has no registeredDateTimeAD, skipping`);
        skippedCount++;
        continue;
      }
      
      const isAlreadyBooked = await checkIfAlreadyBooked(
        accessToken, 
        spreadsheetId, 
        registeredDateTime
      );
      
      if (!isAlreadyBooked) {
        await copyToBookedClients(accessToken, spreadsheetId, client.rowNumber);
        migratedCount++;
        console.log(`[MIGRATED] ${client.clientName} (row ${client.rowNumber})`);
      } else {
        alreadyExistsCount++;
        console.log(`[EXISTS] ${client.clientName} already in BOOKED CLIENTS`);
      }
    }
  }
  
  console.log(`Migration complete: ${migratedCount} migrated, ${alreadyExistsCount} already existed, ${skippedCount} skipped`);
  return { success: true, migratedCount, alreadyExistsCount, skippedCount };
}

// Resync all booked clients: sync payment data from CLIENT TRACKER to BOOKED CLIENTS
async function resyncAllBookedClients(accessToken: string, spreadsheetId: string) {
  console.log('[RESYNC] Starting full resync of booked clients...');
  
  // Get all data from CLIENT TRACKER (columns A and AE-AG for payments)
  const trackerRange = encodeURIComponent("'CLIENT TRACKER'!A2:AG2000");
  const trackerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerRange}`;
  
  const trackerResponse = await fetch(trackerUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!trackerResponse.ok) {
    throw new Error('Failed to fetch CLIENT TRACKER data');
  }
  
  const trackerData = await trackerResponse.json();
  const trackerRows = trackerData.values || [];
  
  // Build a map of registeredDateTimeAD -> payment data from CLIENT TRACKER
  // Column indices: A=0, AE=30, AF=31, AG=32
  const trackerPaymentMap: Record<string, { paymentsMade: string; paymentDatesAD: string; remainingPayment: string; rowNumber: number }> = {};
  
  for (let i = 0; i < trackerRows.length; i++) {
    const row = trackerRows[i];
    const registeredDateTime = (row[0] || '').trim();
    if (registeredDateTime) {
      trackerPaymentMap[registeredDateTime] = {
        paymentsMade: row[30] || '',
        paymentDatesAD: row[31] || '',
        remainingPayment: row[32] || '',
        rowNumber: i + 2
      };
    }
  }
  
  console.log(`[RESYNC] Built tracker map with ${Object.keys(trackerPaymentMap).length} entries`);
  
  // Get all data from BOOKED CLIENTS
  const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:AG500");
  const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`;
  
  const bookedResponse = await fetch(bookedUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!bookedResponse.ok) {
    throw new Error('Failed to fetch BOOKED CLIENTS data');
  }
  
  const bookedData = await bookedResponse.json();
  const bookedRows = bookedData.values || [];
  
  let syncedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;
  
  for (let i = 0; i < bookedRows.length; i++) {
    const row = bookedRows[i];
    const registeredDateTime = (row[0] || '').trim();
    const bookedRowNumber = i + 2;
    
    if (!registeredDateTime) {
      skippedCount++;
      continue;
    }
    
    const trackerData = trackerPaymentMap[registeredDateTime];
    
    if (!trackerData) {
      console.log(`[RESYNC] No match in tracker for booked row ${bookedRowNumber}: ${registeredDateTime.substring(0, 20)}...`);
      notFoundCount++;
      continue;
    }
    
    // Current values in BOOKED CLIENTS
    const bookedPaymentsMade = row[30] || '';
    const bookedPaymentDatesAD = row[31] || '';
    const bookedRemainingPayment = row[32] || '';
    
    // Check if data differs and needs update
    const needsUpdate = 
      bookedPaymentsMade !== trackerData.paymentsMade ||
      bookedPaymentDatesAD !== trackerData.paymentDatesAD ||
      bookedRemainingPayment !== trackerData.remainingPayment;
    
    if (needsUpdate) {
      // Update BOOKED CLIENTS with data from CLIENT TRACKER
      const updateRange = encodeURIComponent(`'BOOKED CLIENTS'!AE${bookedRowNumber}:AG${bookedRowNumber}`);
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
      
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          values: [[trackerData.paymentsMade, trackerData.paymentDatesAD, trackerData.remainingPayment]] 
        }),
      });
      
      if (updateResponse.ok) {
        console.log(`[RESYNC] Synced row ${bookedRowNumber} from tracker row ${trackerData.rowNumber}`);
        syncedCount++;
      } else {
        console.error(`[RESYNC] Failed to update row ${bookedRowNumber}:`, await updateResponse.text());
      }
    } else {
      skippedCount++;
    }
  }
  
  console.log(`[RESYNC] Complete: ${syncedCount} synced, ${skippedCount} unchanged, ${notFoundCount} not found in tracker`);
  return { success: true, syncedCount, skippedCount, notFoundCount, totalBooked: bookedRows.length };
}

// Full resync all booked clients: sync ALL data (columns A-AI) from CLIENT TRACKER to BOOKED CLIENTS
// Also scans for BOOKED clients in tracker that are missing from BOOKED CLIENTS and copies them
// forceSync = true will skip comparison and always copy data from tracker
async function fullResyncAllBookedClients(accessToken: string, spreadsheetId: string, forceSync: boolean = false) {
  console.log(`[FULL RESYNC] Starting ${forceSync ? 'FORCED' : 'normal'} comprehensive resync of booked clients...`);
  
  // Get ALL data from CLIENT TRACKER (columns A through AI)
  const trackerRange = encodeURIComponent("'CLIENT TRACKER'!A2:AI2000");
  const trackerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerRange}`;
  
  const trackerResponse = await fetch(trackerUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!trackerResponse.ok) {
    throw new Error('Failed to fetch CLIENT TRACKER data for full resync');
  }
  
  const trackerData = await trackerResponse.json();
  const trackerRows = trackerData.values || [];
  
  // Build a map of registeredDateTimeAD -> full row data from CLIENT TRACKER
  const trackerFullDataMap: Map<string, { rowData: string[]; trackerRowNumber: number }> = new Map();
  // Also track all BOOKED clients in tracker for Phase 1
  const bookedInTracker: { registeredDateTime: string; trackerRowNumber: number }[] = [];
  
  for (let i = 0; i < trackerRows.length; i++) {
    const row = trackerRows[i];
    const registeredDateTime = (row[0] || '').trim();
    const statusLog = (row[22] || '').toUpperCase(); // Column W (index 22) - status log
    
    if (registeredDateTime) {
      trackerFullDataMap.set(registeredDateTime, {
        rowData: row,
        trackerRowNumber: i + 2
      });
      
      // Check if this client has BOOKED status (but not "BOOKED SOMEWHERE ELSE")
      if (statusLog.includes('BOOKED') && !statusLog.includes('SOMEWHERE ELSE')) {
        bookedInTracker.push({
          registeredDateTime,
          trackerRowNumber: i + 2
        });
      }
    }
  }
  
  console.log(`[FULL RESYNC] Built tracker map with ${trackerFullDataMap.size} entries`);
  console.log(`[FULL RESYNC] Found ${bookedInTracker.length} BOOKED clients in tracker`);
  
  // Get all data from BOOKED CLIENTS
  const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:AI500");
  const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`;
  
  const bookedResponse = await fetch(bookedUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!bookedResponse.ok) {
    throw new Error('Failed to fetch BOOKED CLIENTS data for full resync');
  }
  
  const bookedData = await bookedResponse.json();
  const bookedRows = bookedData.values || [];
  
  // Build set of existing BOOKED CLIENTS IDs
  const existingBookedIds = new Set<string>();
  for (const row of bookedRows) {
    const id = (row[0] || '').trim();
    if (id) {
      existingBookedIds.add(id);
    }
  }
  
  // === PHASE 0 (NEW): Reverse sync - Copy missing clients from BOOKED CLIENTS to CLIENT TRACKER ===
  let restoredToTrackerCount = 0;
  const restoredToTracker: string[] = [];
  
  for (const row of bookedRows) {
    const registeredDateTime = (row[0] || '').trim();
    const clientName = (row[2] || '').trim();
    
    if (registeredDateTime && !trackerFullDataMap.has(registeredDateTime)) {
      // This client exists in BOOKED CLIENTS but NOT in CLIENT TRACKER - restore it!
      console.log(`[FULL RESYNC] Phase 0: Restoring missing client "${clientName}" from BOOKED to TRACKER`);
      
      try {
        // Get the sheet ID for CLIENT TRACKER to insert a new row
        const sheetId = await getSheetId(accessToken, spreadsheetId, 'CLIENT TRACKER');
        
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
        
        // Copy the entire row from BOOKED CLIENTS to CLIENT TRACKER row 2
        // Ensure we have 35 columns (A-AI)
        const paddedRowData = [...row];
        while (paddedRowData.length < 35) {
          paddedRowData.push('');
        }
        
        const writeRange = encodeURIComponent("'CLIENT TRACKER'!A2:AI2");
        const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`;
        
        const writeResponse = await fetch(writeUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [paddedRowData.slice(0, 35)] }),
        });
        
        if (writeResponse.ok) {
          restoredToTrackerCount++;
          restoredToTracker.push(clientName || registeredDateTime.substring(0, 20));
          // Add to tracker map so we don't try to copy it again
          trackerFullDataMap.set(registeredDateTime, { rowData: row, trackerRowNumber: 2 });
          console.log(`[FULL RESYNC] Successfully restored "${clientName}" to CLIENT TRACKER`);
        } else {
          console.error(`[FULL RESYNC] Failed to restore "${clientName}" to tracker:`, await writeResponse.text());
        }
      } catch (error) {
        console.error(`[FULL RESYNC] Error restoring "${clientName}" to tracker:`, error);
      }
    }
  }
  
  console.log(`[FULL RESYNC] Phase 0 complete: Restored ${restoredToTrackerCount} missing clients to CLIENT TRACKER`);
  
  // === PHASE 1: Copy missing BOOKED clients from tracker to BOOKED CLIENTS ===
  let copiedCount = 0;
  
  for (const client of bookedInTracker) {
    if (!existingBookedIds.has(client.registeredDateTime)) {
      console.log(`[FULL RESYNC] Phase 1: Copying missing BOOKED client from tracker row ${client.trackerRowNumber}`);
      try {
        await copyToBookedClients(accessToken, spreadsheetId, client.trackerRowNumber);
        copiedCount++;
        // Add to existing set to prevent duplicates if function is called again
        existingBookedIds.add(client.registeredDateTime);
      } catch (error) {
        console.error(`[FULL RESYNC] Failed to copy client from row ${client.trackerRowNumber}:`, error);
      }
    }
  }
  
  console.log(`[FULL RESYNC] Phase 1 complete: Copied ${copiedCount} missing BOOKED clients`);
  
  // === PHASE 2: Sync existing data between sheets ===
  // Re-fetch booked clients if we copied new ones
  let currentBookedRows = bookedRows;
  if (copiedCount > 0) {
    const refreshResponse = await fetch(bookedUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (refreshResponse.ok) {
      const refreshData = await refreshResponse.json();
      currentBookedRows = refreshData.values || [];
    }
  }
  
  let syncedCount = 0;
  let skippedCount = 0;
  let notFoundCount = 0;
  
  // Track detailed sync info for report
  const syncDetails: { 
    clientName: string; 
    bookedRow: number; 
    trackerRow: number; 
    changedColumns: string[];
  }[] = [];
  
  // Column names for human-readable report
  const columnNames: Record<number, string> = {
    0: 'Registered DateTime', 1: 'Registered Date BS', 2: 'Client Name', 3: 'Source',
    4: 'Location', 5: 'Country', 6: 'Contact', 7: 'WhatsApp', 8: 'Email',
    9: 'Event Location', 10: 'Event City', 11: 'Events', 12: 'Event Year',
    13: 'Event Month', 14: 'Event Day', 15: 'Event Date AD', 16: 'Who Added',
    17: 'Inquiry Date AD', 18: 'Inquiry Date BS', 19: 'Inquiry Time', 20: 'Description',
    21: 'Quotation', 22: 'Status Log', 23: 'Handler', 24: 'Call Log', 25: 'Mindset',
    26: 'Our Bargained', 27: 'Client Bargained', 28: 'Comments', 29: 'Final Quotation',
    30: 'Payments Made', 31: 'Payment Dates', 32: 'Remaining Payment', 33: 'Company', 34: 'Service Types'
  };
  
  for (let i = 0; i < currentBookedRows.length; i++) {
    const row = currentBookedRows[i];
    const registeredDateTime = (row[0] || '').trim();
    const clientName = (row[2] || '').trim(); // Column C = client name
    const bookedRowNumber = i + 2;
    
    if (!registeredDateTime) {
      skippedCount++;
      continue;
    }
    
    const trackerEntry = trackerFullDataMap.get(registeredDateTime);
    
    if (!trackerEntry) {
      console.log(`[FULL RESYNC] No match in tracker for booked row ${bookedRowNumber}: ${registeredDateTime.substring(0, 20)}...`);
      notFoundCount++;
      continue;
    }
    
    // Compare ALL columns (A-AI = 35 columns) for comprehensive check
    // Or force update if forceSync is true
    const bookedAllData = row.slice(0, 35).map((v: string) => (v || '').trim()).join('|');
    const trackerAllData = trackerEntry.rowData.slice(0, 35).map((v: string) => (v || '').trim()).join('|');
    
    const needsUpdate = forceSync || bookedAllData !== trackerAllData;
    
    // Track which columns differ for the report
    const changedColumns: string[] = [];
    if (needsUpdate) {
      for (let col = 0; col < 35; col++) {
        const bookedVal = (row[col] || '').trim();
        const trackerVal = (trackerEntry.rowData[col] || '').trim();
        if (bookedVal !== trackerVal) {
          changedColumns.push(columnNames[col] || `Column ${col}`);
        }
      }
      if (!forceSync) {
        console.log(`[FULL RESYNC] Row ${bookedRowNumber} differs in columns: ${changedColumns.join(', ')}`);
      }
    }
    
    if (needsUpdate) {
      // Update ENTIRE row in BOOKED CLIENTS (columns A:AI)
      const updateRange = encodeURIComponent(`'BOOKED CLIENTS'!A${bookedRowNumber}:AI${bookedRowNumber}`);
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
      
      // Ensure the row data has 35 columns (A-AI)
      const paddedRowData = [...trackerEntry.rowData];
      while (paddedRowData.length < 35) {
        paddedRowData.push('');
      }
      
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [paddedRowData.slice(0, 35)] }),
      });
      
      if (updateResponse.ok) {
        console.log(`[FULL RESYNC] Synced row ${bookedRowNumber} from tracker row ${trackerEntry.trackerRowNumber}`);
        syncedCount++;
        
        // Add to sync details for report
        syncDetails.push({
          clientName: clientName || trackerEntry.rowData[2] || 'Unknown',
          bookedRow: bookedRowNumber,
          trackerRow: trackerEntry.trackerRowNumber,
          changedColumns: changedColumns.length > 0 ? changedColumns : ['All (forced sync)']
        });
      } else {
        console.error(`[FULL RESYNC] Failed to update row ${bookedRowNumber}:`, await updateResponse.text());
      }
    } else {
      skippedCount++;
    }
  }
  
  console.log(`[FULL RESYNC] Complete: ${restoredToTrackerCount} restored to tracker, ${copiedCount} copied to booked, ${syncedCount} synced, ${skippedCount} unchanged, ${notFoundCount} not found in tracker`);
  return { 
    success: true, 
    restoredToTrackerCount, // NEW: clients restored from BOOKED to TRACKER
    restoredToTracker,      // NEW: names of restored clients
    copiedCount, 
    syncedCount, 
    skippedCount, 
    notFoundCount, 
    totalBooked: currentBookedRows.length,
    syncDetails // Return detailed sync info
  };
}

// Update a booked client in both BOOKED CLIENTS and CLIENT TRACKER sheets
// CORRECT COLUMN MAPPING (A-AG identical in both sheets):
// AD = finalQuotation, AE = paymentsMade, AF = paymentDatesAD, AG = remainingPayment
// X = clientHandler, AC = comments
async function updateBookedClient(
  accessToken: string, 
  spreadsheetId: string, 
  bookedRowNumber: number,
  originalRowNumber: number,
  updates: Record<string, unknown>
) {
  // BOTH sheets have IDENTICAL structure (A-AG), so same column letters
  const columnMap: Record<string, string> = {
    finalQuotation: 'AD',     // Column AD (index 29)
    paymentsMade: 'AE',       // Column AE (index 30)
    paymentDatesAD: 'AF',     // Column AF (index 31)
    remainingPayment: 'AG',   // Column AG (index 32)
    clientHandler: 'X',       // Column X (index 23)
    comments: 'AC',           // Column AC (index 28)
    mindset: 'Z',             // Column Z (index 25)
    ourBargainedRates: 'AA',  // Column AA (index 26)
    clientBargainedRates: 'AB', // Column AB (index 27)
    callLog: 'Y',             // Column Y (index 24)
    quotationData: 'V',       // Column V (index 21)
    statusLog: 'W',           // Column W (index 22)
  };

  // Update each field in both sheets
  for (const [field, value] of Object.entries(updates)) {
    const column = columnMap[field];
    
    if (column && value !== undefined) {
      // Update BOOKED CLIENTS
      const bookedRange = encodeURIComponent(`'BOOKED CLIENTS'!${column}${bookedRowNumber}`);
      const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}?valueInputOption=USER_ENTERED`;
      
      await fetch(bookedUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [[value]] }),
      });
      
      // Update CLIENT TRACKER (same column letter since identical structure)
      if (originalRowNumber >= 2) {
        const trackerRange = encodeURIComponent(`'CLIENT TRACKER'!${column}${originalRowNumber}`);
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

// ============= VENDOR MANAGEMENT FUNCTIONS =============

// Get vendor types from Column X of setup data
async function getVendorTypes(accessToken: string, spreadsheetId: string) {
  const range = encodeURIComponent("'CLIENT TRACKER SETUP DATA'!X2:X100");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (getVendorTypes):', response.status, errorText);
    throw new Error(`Google Sheets API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.values) return [];
  
  return data.values.flat().filter(Boolean);
}

// Get all vendors from VENDORS sheet
async function getVendors(accessToken: string, spreadsheetId: string, limit = 500) {
  const range = encodeURIComponent("'VENDORS'!A2:R" + (limit + 1));
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (getVendors):', response.status, errorText);
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (!data.values) return [];

  return data.values.map((row: string[], index: number) => ({
    rowNumber: index + 2,
    vendorName: row[0] || '',           // Column A
    vendorType: row[1] || '',           // Column B
    companyContactNo: row[2] || '',     // Column C
    owner1Name: row[3] || '',           // Column D
    owner1ContactNo: row[4] || '',      // Column E
    owner1WhatsappNo: row[5] || '',     // Column F
    owner2Name: row[6] || '',           // Column G
    owner2ContactNo: row[7] || '',      // Column H
    owner2WhatsappNo: row[8] || '',     // Column I
    city: row[9] || '',                 // Column J
    area: row[10] || '',                // Column K
    googleMapLink: row[11] || '',       // Column L
    instagramLink: row[12] || '',       // Column M
    facebookLink: row[13] || '',        // Column N
    tiktokLink: row[14] || '',          // Column O
    youtubeLink: row[15] || '',         // Column P
    websiteLink: row[16] || '',         // Column Q
    email: row[17] || '',               // Column R
  }));
}

// Add new vendor at row 2
async function addVendor(accessToken: string, spreadsheetId: string, vendorData: Record<string, unknown>) {
  const sheetId = await getSheetId(accessToken, spreadsheetId, 'VENDORS');
  
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
  const values = [[
    vendorData.vendorName || '',           // A: Vendor Name
    vendorData.vendorType || '',           // B: Vendor Type
    vendorData.companyContactNo || '',     // C: Company Contact No
    vendorData.owner1Name || '',           // D: Owner 1 Name
    vendorData.owner1ContactNo || '',      // E: Owner 1 Contact No
    vendorData.owner1WhatsappNo || '',     // F: Owner 1 WhatsApp No
    vendorData.owner2Name || '',           // G: Owner 2 Name
    vendorData.owner2ContactNo || '',      // H: Owner 2 Contact No
    vendorData.owner2WhatsappNo || '',     // I: Owner 2 WhatsApp No
    vendorData.city || '',                 // J: City
    vendorData.area || '',                 // K: Area
    vendorData.googleMapLink || '',        // L: Google Map
    vendorData.instagramLink || '',        // M: Instagram
    vendorData.facebookLink || '',         // N: Facebook
    vendorData.tiktokLink || '',           // O: TikTok
    vendorData.youtubeLink || '',          // P: YouTube
    vendorData.websiteLink || '',          // Q: Website
    vendorData.email || '',                // R: Email
  ]];

  const range = encodeURIComponent("'VENDORS'!A2:R2");
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
    console.error('Google Sheets API error (addVendor):', response.status, errorText);
    throw new Error(`Failed to add vendor: ${response.status}`);
  }

  return { success: true };
}

// Update existing vendor
async function updateVendor(accessToken: string, spreadsheetId: string, vendorData: Record<string, unknown>) {
  const rowNumber = vendorData.rowNumber as number;
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating vendor');
  }

  const values = [[
    vendorData.vendorName || '',           // A: Vendor Name
    vendorData.vendorType || '',           // B: Vendor Type
    vendorData.companyContactNo || '',     // C: Company Contact No
    vendorData.owner1Name || '',           // D: Owner 1 Name
    vendorData.owner1ContactNo || '',      // E: Owner 1 Contact No
    vendorData.owner1WhatsappNo || '',     // F: Owner 1 WhatsApp No
    vendorData.owner2Name || '',           // G: Owner 2 Name
    vendorData.owner2ContactNo || '',      // H: Owner 2 Contact No
    vendorData.owner2WhatsappNo || '',     // I: Owner 2 WhatsApp No
    vendorData.city || '',                 // J: City
    vendorData.area || '',                 // K: Area
    vendorData.googleMapLink || '',        // L: Google Map
    vendorData.instagramLink || '',        // M: Instagram
    vendorData.facebookLink || '',         // N: Facebook
    vendorData.tiktokLink || '',           // O: TikTok
    vendorData.youtubeLink || '',          // P: YouTube
    vendorData.websiteLink || '',          // Q: Website
    vendorData.email || '',                // R: Email
  ]];

  const range = encodeURIComponent(`'VENDORS'!A${rowNumber}:R${rowNumber}`);
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
    console.error('Google Sheets API error (updateVendor):', response.status, errorText);
    throw new Error(`Failed to update vendor: ${response.status}`);
  }

  return { success: true };
}

// Delete vendor (clear the row or delete it)
async function deleteVendor(accessToken: string, spreadsheetId: string, rowNumber: number) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for deleting vendor');
  }

  const sheetId = await getSheetId(accessToken, spreadsheetId, 'VENDORS');
  
  // Delete the row
  const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const response = await fetch(deleteUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1, // 0-indexed
            endIndex: rowNumber,
          },
        },
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (deleteVendor):', response.status, errorText);
    throw new Error(`Failed to delete vendor: ${response.status}`);
  }

  return { success: true };
}

// ============= MY ACCOUNTS MODULE =============

// Get setup data for account form dropdowns (from WTN SECRETS SETUP DATA)
async function getAccountSetupData(accessToken: string, spreadsheetId: string) {
  const range = encodeURIComponent("'WTN SECRETS SETUP DATA'!A2:B100");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (getAccountSetupData):', response.status, errorText);
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (!data.values) return { accountTypes: [], whoBoughtIt: [] };

  const rows = data.values;
  return {
    accountTypes: rows.map((r: string[]) => r[0]).filter(Boolean),  // Column A
    whoBoughtIt: rows.map((r: string[]) => r[1]).filter(Boolean),   // Column B
  };
}

// Get all vendors from WTN SECRETS VENDOR INFO sheet
async function getSecretsVendors(accessToken: string, spreadsheetId: string) {
  const range = encodeURIComponent("'WTN SECRETS VENDOR INFO'!A2:F500");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (getSecretsVendors):', response.status, errorText);
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (!data.values) return [];

  return data.values.map((row: string[]) => ({
    vendorName: row[0] || '',
    vendorNumber: row[1] || '',
    vendorWhatsapp: row[2] || '',
    website: row[3] || '',
    instagram: row[4] || '',
    facebook: row[5] || '',
  }));
}

// Add new vendor to WTN SECRETS VENDOR INFO sheet
async function addSecretsVendor(accessToken: string, spreadsheetId: string, vendorData: Record<string, unknown>) {
  const rowData = [
    vendorData.vendorName || '',
    vendorData.vendorNumber || '',
    vendorData.vendorWhatsapp || '',
    vendorData.website || '',
    vendorData.instagram || '',
    vendorData.facebook || '',
  ];

  // Append to end of sheet
  const range = encodeURIComponent("'WTN SECRETS VENDOR INFO'!A:F");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [rowData] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (addSecretsVendor):', response.status, errorText);
    throw new Error(`Failed to add vendor: ${response.status}`);
  }

  return { success: true };
}

// Get account credentials from WTN ID PASSWORD sheet
async function getAccounts(accessToken: string, spreadsheetId: string, limit = 500) {
  const range = encodeURIComponent("'WTN ID PASSWORD'!A2:P" + (limit + 1));
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (getAccounts):', response.status, errorText);
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (!data.values) return [];

  return data.values.map((row: string[], index: number) => ({
    rowNumber: index + 2,
    accountType: row[0] || '',      // Column A
    id: row[1] || '',               // Column B
    password: row[2] || '',         // Column C
    recoveryAccount: row[3] || '',  // Column D
    registeredNumber: row[4] || '', // Column E
    whoBoughtIt: row[5] || '',      // Column F
    vendor: row[6] || '',           // Column G
    vendorNumber: row[7] || '',     // Column H
    vendorWhatsapp: row[8] || '',   // Column I
    website: row[9] || '',          // Column J
    instagram: row[10] || '',       // Column K
    facebook: row[11] || '',        // Column L
    dateOfPurchase: row[12] || '',  // Column M
    validity: row[13] || '',        // Column N (months)
    expiryDate: row[14] || '',      // Column O
    price: row[15] || '',           // Column P
  }));
}

// Add new account to WTN ID PASSWORD sheet
async function addNewAccount(accessToken: string, spreadsheetId: string, accountData: Record<string, unknown>) {
  const sheetId = await getSheetId(accessToken, spreadsheetId, 'WTN ID PASSWORD');
  
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

  // Calculate expiry date if dateOfPurchase and validity are provided
  let expiryDate = '';
  if (accountData.dateOfPurchase && accountData.validity) {
    const purchaseDate = new Date(accountData.dateOfPurchase as string);
    const months = parseInt(accountData.validity as string, 10);
    if (!isNaN(purchaseDate.getTime()) && !isNaN(months)) {
      const expiry = new Date(purchaseDate);
      expiry.setMonth(expiry.getMonth() + months);
      expiryDate = expiry.toISOString().split('T')[0]; // YYYY-MM-DD format
    }
  }

  // Build the row data (Columns A-P)
  const rowData = [
    accountData.accountType || '',       // Column A
    accountData.id || '',                // Column B
    accountData.password || '',          // Column C
    accountData.recoveryAccount || '',   // Column D
    accountData.registeredNumber || '',  // Column E
    accountData.whoBoughtIt || '',       // Column F
    accountData.vendor || '',            // Column G
    accountData.vendorNumber || '',      // Column H
    accountData.vendorWhatsapp || '',    // Column I
    accountData.website || '',           // Column J
    accountData.instagram || '',         // Column K
    accountData.facebook || '',          // Column L
    accountData.dateOfPurchase || '',    // Column M
    accountData.validity || '',          // Column N
    expiryDate,                          // Column O (calculated)
    accountData.price || '',             // Column P
  ];

  // Now write data to row 2
  const range = encodeURIComponent("'WTN ID PASSWORD'!A2:P2");
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [rowData] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (addNewAccount):', response.status, errorText);
    throw new Error(`Failed to add account: ${response.status}`);
  }

  return { success: true, rowNumber: 2 };
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
          data.clientTimestamp as string | undefined,
          data.registeredDateTimeAD as string | undefined
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
        result = await updateClientHandler(accessToken, spreadsheetId, data.rowNumber as number, data.handler as string, data.registeredDateTimeAD as string | undefined);
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
          data.clientDate as string,
          data.registeredDateTimeAD as string | undefined
        );
        break;
      case 'updateClientQuotation':
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for updateClientQuotation');
        result = await updateClientQuotation(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.quotationData as string || '',
          data.registeredDateTimeAD as string | undefined
        );
        break;
      case 'updateClientMindset':
        if (!data || !data.rowNumber || !data.mindset) throw new Error('rowNumber and mindset are required for updateClientMindset');
        result = await updateClientMindset(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.mindset as string,
          data.clientTimestamp as string,
          data.registeredDateTimeAD as string | undefined
        );
        break;
      case 'updateBargainingRates':
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for updateBargainingRates');
        result = await updateBargainingRates(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.ourRates as string || '',
          data.clientRates as string || '',
          data.registeredDateTimeAD as string | undefined
        );
        break;
      case 'updateClientBargainedRates':
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for updateClientBargainedRates');
        result = await updateClientBargainedRates(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.clientRates as string || '',
          data.registeredDateTimeAD as string | undefined
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
          data.clientTimestamp as string,
          data.registeredDateTimeAD as string | undefined
        );
        break;
      case 'updateFinalQuotation':
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for updateFinalQuotation');
        result = await updateFinalQuotation(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.finalQuotation as string || '',
          data.registeredDateTimeAD as string | undefined
        );
        break;
      case 'updateOurCounterRates':
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for updateOurCounterRates');
        result = await updateOurCounterRates(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.ourRates as string || '',
          data.registeredDateTimeAD as string | undefined
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
          data.finalQuotationAmount as number || 0,
          data.registeredDateTimeAD as string | undefined,
          data.sourceSheet as 'tracker' | 'booked' | undefined,
          data.clientName as string | undefined
        );
        break;
      case 'updatePayment':
        if (!data || data.rowNumber === undefined || data.paymentIndex === undefined || !data.newAmount || !data.newType || !data.newYear || !data.newMonth || !data.newDay || !data.newBank) {
          throw new Error('rowNumber, paymentIndex, newAmount, newType, newYear, newMonth, newDay, and newBank are required for updatePayment');
        }
        result = await updatePaymentEntry(
          accessToken, 
          spreadsheetId, 
          data.rowNumber as number, 
          data.paymentIndex as number,
          data.newAmount as string,
          data.newType as string,
          data.newYear as string,
          data.newMonth as string,
          data.newDay as string,
          data.newBank as string,
          data.existingPaymentsMade as string || '',
          data.finalQuotationAmount as number || 0,
          data.registeredDateTimeAD as string | undefined
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
      case 'resyncAllBookedClients':
        result = await resyncAllBookedClients(accessToken, spreadsheetId);
        break;
      case 'fullResyncAllBookedClients': {
        const forceSync = Boolean(data?.forceSync);
        result = await fullResyncAllBookedClients(accessToken, spreadsheetId, forceSync);
        break;
      }
      // Vendor Management Actions
      case 'getVendors':
        result = await getVendors(accessToken, spreadsheetId, body.limit);
        break;
      case 'getVendorTypes':
        result = await getVendorTypes(accessToken, spreadsheetId);
        break;
      case 'addVendor':
        if (!data) throw new Error('data is required for addVendor');
        result = await addVendor(accessToken, spreadsheetId, data);
        break;
      case 'updateVendor':
        if (!data) throw new Error('data is required for updateVendor');
        result = await updateVendor(accessToken, spreadsheetId, data);
        break;
      case 'deleteVendor':
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for deleteVendor');
        result = await deleteVendor(accessToken, spreadsheetId, data.rowNumber as number);
        break;
      // Event Details Actions
      case 'getBookedEventDetails':
        result = await getBookedEventDetails(accessToken, spreadsheetId, body.limit);
        break;
      case 'syncToEventDetails':
        if (!data || !data.registeredDateTimeAD) throw new Error('registeredDateTimeAD is required for syncToEventDetails');
        result = await syncToEventDetails(accessToken, spreadsheetId, data.registeredDateTimeAD as string);
        break;
      case 'fullSyncEventDetails':
        result = await fullSyncEventDetails(accessToken, spreadsheetId);
        break;
      case 'updateEventDetails':
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for updateEventDetails');
        result = await updateEventDetails(accessToken, spreadsheetId, data.rowNumber as number, data.updates as Record<string, string> || {});
        break;
      case 'getClientEventDetails':
        if (!data || !data.registeredDateTimeAD) throw new Error('registeredDateTimeAD is required for getClientEventDetails');
        result = await getClientEventDetails(accessToken, spreadsheetId, data.registeredDateTimeAD as string);
        break;
      case 'updateClientEventDetails':
        if (!data || !data.registeredDateTimeAD || data.eventIndex === undefined) {
          throw new Error('registeredDateTimeAD and eventIndex are required for updateClientEventDetails');
        }
        result = await updateClientEventDetails(
          accessToken, 
          spreadsheetId, 
          data.registeredDateTimeAD as string,
          data.eventIndex as number,
          data.updates as Record<string, string> || {}
        );
        break;
      case 'getAccounts': {
        // Use WTN SECRETS spreadsheet for accounts (different from main spreadsheet)
        const secretsSpreadsheetId = Deno.env.get('WTN_SECRETS_SPREADSHEET_ID') || spreadsheetId;
        result = await getAccounts(accessToken, secretsSpreadsheetId, body.limit);
        break;
      }
      case 'addAccount': {
        if (!data) throw new Error('data is required for addAccount');
        // Use WTN SECRETS spreadsheet for accounts (different from main spreadsheet)
        const secretsSpreadsheetId = Deno.env.get('WTN_SECRETS_SPREADSHEET_ID') || spreadsheetId;
        result = await addNewAccount(accessToken, secretsSpreadsheetId, data);
        break;
      }
      case 'getAccountSetupData': {
        const secretsSpreadsheetId = Deno.env.get('WTN_SECRETS_SPREADSHEET_ID') || spreadsheetId;
        result = await getAccountSetupData(accessToken, secretsSpreadsheetId);
        break;
      }
      case 'getSecretsVendors': {
        const secretsSpreadsheetId = Deno.env.get('WTN_SECRETS_SPREADSHEET_ID') || spreadsheetId;
        result = await getSecretsVendors(accessToken, secretsSpreadsheetId);
        break;
      }
      case 'addSecretsVendor': {
        if (!data) throw new Error('data is required for addSecretsVendor');
        const secretsSpreadsheetId = Deno.env.get('WTN_SECRETS_SPREADSHEET_ID') || spreadsheetId;
        result = await addSecretsVendor(accessToken, secretsSpreadsheetId, data);
        break;
      }
      case 'getEventSetupData':
        result = await getEventSetupData(accessToken, spreadsheetId);
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
