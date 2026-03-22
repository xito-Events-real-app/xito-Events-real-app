// Google Sheets Edge Function for WTN Client Tracker
// Handles read/write operations with the Google Sheets API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry wrapper for Google Sheets API calls to handle 429 rate limits
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);
    
    if (response.status === 429 && attempt < maxRetries) {
      const retryAfter = response.headers.get('Retry-After');
      const waitMs = retryAfter 
        ? parseInt(retryAfter, 10) * 1000 
        : Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
      console.log(`[RETRY] 429 rate limited, waiting ${Math.round(waitMs)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, waitMs));
      continue;
    }
    
    return response;
  }
  // Should not reach here, but return last attempt
  return fetch(url, options);
}

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
  action: 'getDropdowns' | 'getClients' | 'getAllClients' | 'getSingleClient' | 'addClient' | 'updateClient' | 'searchClients' | 'testConnection' | 'getClientStatuses' | 'updateClientStatus' | 'addOldClient' | 'bulkUpdateStatus' | 'updateClientHandler' | 'logCallAttempt' | 'updateClientQuotation' | 'updateClientMindset' | 'updateBargainingRates' | 'updateClientBargainedRates' | 'updateOurCounterRates' | 'addClientComment' | 'addBookedClientComment' | 'updateFinalQuotation' | 'addPayment' | 'updatePayment' | 'getBookedClients' | 'migrateExistingBookedClients' | 'updateBookedClient' | 'resyncAllBookedClients' | 'fullResyncAllBookedClients' | 'cleanupDuplicateBookedFromTracker' | 'getVendors' | 'addVendor' | 'updateVendor' | 'deleteVendor' | 'getVendorTypes' | 'getBookedEventDetails' | 'syncToEventDetails' | 'fullSyncEventDetails' | 'updateEventDetails' | 'getClientEventDetails' | 'updateClientEventDetails' | 'getBulkEventDetails' | 'getAccounts' | 'addAccount' | 'getAccountSetupData' | 'getSecretsVendors' | 'addSecretsVendor' | 'getEventSetupData' | 'getEventDetailsSetupData' | 'getVenuesByType' | 'addVenueEntry' | 'getParlourTypes' | 'getParloursByType' | 'addParlourEntry' | 'refreshClientVendorData' | 'getClientContactDetails' | 'updateClientContactDetails' | 'fullSyncContactDetails' | 'resyncClientContactDetails' | 'getPublicFormData' | 'updateClientPriority' | 'updateBenzoKeepNotes' | 'getSearchHistory' | 'saveSearchQuery' | 'getUnassignedBenzoKeepNotes' | 'saveUnassignedBenzoKeepNote' | 'deleteUnassignedBenzoKeepNote' | 'transferBenzoKeepNote' | 'getClientsForNoteAssignment' | 'assignBenzoKeepNoteToClient' | 'getDailyTasks' | 'addDailyTask' | 'updateDailyTask' | 'updateDailyTaskStatus' | 'getDailyTaskSetupData' | 'getFreelancers' | 'addFreelancer' | 'updateFreelancer' | 'deleteFreelancer' | 'syncFreelancerCategories' | 'getClientFreelancerAssignments' | 'updateFreelancerAssignment' | 'checkFreelancerAvailability' | 'fullSyncFreelancerAssignments' | 'getFreelancerBookings' | 'getAllFreelancerAssignments' | 'restoreFreelancerAssignments' | 'updateRequiredCrewCategories' | 'deleteClient' | 'reconcileBookedClients' | 'pullStorageDevices' | 'pushFilesToSheet' | 'pushStorageDevicesToSheet' | 'getVideoEditRows' | 'updateVideoEditRow' | 'generateVideoEditRows' | 'pushVideoEditToLab' | 'pushVideoEditsToSheet';
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
  
  const response = await fetchWithRetry(url, {
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
    relationOptions: getColumn(17),   // Column R - Relation options for backup contacts
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

// Get venue types from EVENT DETAILS SETUP DATA sheet (Column A, starting from row 2)
async function getEventDetailsSetupData(accessToken: string, spreadsheetId: string) {
  const range = encodeURIComponent("'EVENT DETAILS SETUP DATA'!A2:A100");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (getEventDetailsSetupData):', response.status, errorText);
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (!data.values) return [];
  
  // Extract venue types from Column A, filter empty values
  return data.values.map((row: string[]) => row[0]).filter(Boolean);
}

// Get public form data (relation options) for the client contact form - no auth required
async function getPublicFormData(accessToken: string, spreadsheetId: string) {
  const range = encodeURIComponent("'CLIENT TRACKER SETUP DATA'!R2:R100");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.warn('Failed to fetch relation options, using defaults');
    return { relationOptions: ['Mother', 'Father', 'Sister', 'Brother', 'Spouse', 'Friend', 'Other'] };
  }

  const data = await response.json();
  const relationOptions = data.values 
    ? data.values.map((row: string[]) => row[0]).filter(Boolean)
    : ['Mother', 'Father', 'Sister', 'Brother', 'Spouse', 'Friend', 'Other'];

  return { relationOptions };
}

// ============= SEARCH HISTORY FUNCTIONS =============
// Get search history from CLIENT TRACKER SETUP DATA Column S (rows 2-51)
async function getSearchHistory(accessToken: string, spreadsheetId: string) {
  const range = encodeURIComponent("'CLIENT TRACKER SETUP DATA'!S2:S51");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.warn('Failed to fetch search history');
    return [];
  }

  const data = await response.json();
  if (!data.values) return [];
  
  // Return array of search queries (filter out empty values)
  return data.values.map((row: string[]) => row[0]).filter(Boolean);
}

// Save a new search query to Column S with FIFO (50 max)
async function saveSearchQuery(accessToken: string, spreadsheetId: string, query: string) {
  if (!query?.trim()) return { success: false };
  
  // 1. First, get current search history
  const currentHistory = await getSearchHistory(accessToken, spreadsheetId);
  
  // 2. Remove duplicate if exists (case-insensitive)
  const filtered = currentHistory.filter(
    (q: string) => q.toLowerCase() !== query.toLowerCase()
  );
  
  // 3. Add new search at the beginning, limit to 50
  const newHistory = [query.trim(), ...filtered].slice(0, 50);
  
  // 4. Prepare values array (pad with empty strings to always write 50 rows)
  const values: string[][] = Array(50).fill(null).map(() => ['']);
  newHistory.forEach((q, i) => { values[i] = [q]; });
  
  // 5. Update the range S2:S51 (50 rows)
  const range = encodeURIComponent("'CLIENT TRACKER SETUP DATA'!S2:S51");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    console.error('Failed to save search query');
    return { success: false };
  }

  return { success: true, history: newHistory };
}

// ============= UNASSIGNED BENZO KEEP NOTES =============
// Stored in Column AM (index 38) of CLIENT TRACKER, Row 2, as a JSON array

interface UnassignedBenzoNote {
  id: string;
  content: string;
  markerColor: 'yellow' | 'green' | 'pink' | 'blue' | 'orange';
  createdAt: string;
  lastUpdated: string;
  isStarred?: boolean;
}

// Get all unassigned Benzo Keep notes from Column AM, Row 2
async function getUnassignedBenzoKeepNotes(accessToken: string, spreadsheetId: string): Promise<UnassignedBenzoNote[]> {
  // Try wider range AM2:AM10 to catch notes that may have shifted rows
  const range = encodeURIComponent("'CLIENT TRACKER'!AM2:AM10");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.error('Failed to fetch unassigned notes, status:', response.status);
    return [];
  }

  const data = await response.json();
  console.log('[UNASSIGNED NOTES] Raw response:', JSON.stringify(data));
  
  if (!data.values) {
    console.log('[UNASSIGNED NOTES] No values found in range AM2:AM10');
    return [];
  }

  // Collect notes from ALL rows (not just the first valid one)
  const allNotes: UnassignedBenzoNote[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < data.values.length; i++) {
    const cellValue = data.values[i]?.[0];
    if (cellValue) {
      try {
        const parsed = JSON.parse(cellValue);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[UNASSIGNED NOTES] Found ${parsed.length} notes in row ${i + 2}`);
          for (const note of parsed) {
            // Deduplicate by id, keeping the one with latest lastUpdated
            if (seenIds.has(note.id)) {
              const existingIdx = allNotes.findIndex(n => n.id === note.id);
              if (existingIdx >= 0 && new Date(note.lastUpdated) > new Date(allNotes[existingIdx].lastUpdated)) {
                allNotes[existingIdx] = note;
              }
            } else {
              seenIds.add(note.id);
              allNotes.push(note);
            }
          }
        }
      } catch (e) {
        console.log(`[UNASSIGNED NOTES] Row ${i + 2} JSON parse failed:`, e);
      }
    }
  }

  console.log(`[UNASSIGNED NOTES] Total unique notes collected: ${allNotes.length}`);
  return allNotes;
}

// Save an unassigned Benzo Keep note (add or update)
async function saveUnassignedBenzoKeepNote(
  accessToken: string, 
  spreadsheetId: string, 
  note: UnassignedBenzoNote
): Promise<{ success: boolean }> {
  // First get existing notes
  const existingNotes = await getUnassignedBenzoKeepNotes(accessToken, spreadsheetId);
  
  // Check if note exists (update) or is new (add)
  const existingIndex = existingNotes.findIndex(n => n.id === note.id);
  
  let updatedNotes: UnassignedBenzoNote[];
  if (existingIndex >= 0) {
    // Update existing
    updatedNotes = existingNotes.map(n => n.id === note.id ? note : n);
  } else {
    // Add new at beginning
    updatedNotes = [note, ...existingNotes];
  }
  
  // Write consolidated notes to AM2 and clear AM3:AM10 to prevent duplicates
  const range = encodeURIComponent("'CLIENT TRACKER'!AM2");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[JSON.stringify(updatedNotes)]] }),
  });

  if (!response.ok) {
    console.error('Failed to save unassigned note');
    return { success: false };
  }

  // Clear stale rows AM3:AM10
  const clearRange = encodeURIComponent("'CLIENT TRACKER'!AM3:AM10");
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`;
  await fetch(clearUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return { success: true };
}

// Delete an unassigned Benzo Keep note
async function deleteUnassignedBenzoKeepNote(
  accessToken: string, 
  spreadsheetId: string, 
  noteId: string
): Promise<{ success: boolean }> {
  // Get existing notes
  const existingNotes = await getUnassignedBenzoKeepNotes(accessToken, spreadsheetId);
  
  // Filter out the note to delete
  const updatedNotes = existingNotes.filter(n => n.id !== noteId);
  
  // Write consolidated notes to AM2 and clear AM3:AM10
  const range = encodeURIComponent("'CLIENT TRACKER'!AM2");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[JSON.stringify(updatedNotes)]] }),
  });

  if (!response.ok) {
    console.error('Failed to delete unassigned note');
    return { success: false };
  }

  // Clear stale rows AM3:AM10
  const clearRange = encodeURIComponent("'CLIENT TRACKER'!AM3:AM10");
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`;
  await fetch(clearUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return { success: true };
}

// Transfer an unassigned note to a client's Benzo Keep (Column AL)
async function transferBenzoKeepNote(
  accessToken: string,
  spreadsheetId: string,
  noteId: string,
  targetClientRegisteredDateTimeAD: string
): Promise<{ success: boolean }> {
  console.log(`[TRANSFER NOTE] Starting transfer for noteId: ${noteId} to client: ${targetClientRegisteredDateTimeAD}`);
  
  // 1. Get the unassigned notes and find the one to transfer
  const unassignedNotes = await getUnassignedBenzoKeepNotes(accessToken, spreadsheetId);
  const noteToTransfer = unassignedNotes.find(n => n.id === noteId);
  
  if (!noteToTransfer) {
    console.error('[TRANSFER NOTE] Note not found');
    return { success: false };
  }
  
  // 2. Find the client row in CLIENT TRACKER
  const range = encodeURIComponent("'CLIENT TRACKER'!A2:AL2000");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    console.error('[TRANSFER NOTE] Failed to fetch client data');
    return { success: false };
  }
  
  const data = await response.json();
  if (!data.values) return { success: false };
  
  // Find the row with matching registeredDateTimeAD
  let targetRow = -1;
  for (let i = 0; i < data.values.length; i++) {
    if (data.values[i][0] === targetClientRegisteredDateTimeAD) {
      targetRow = i + 2; // +2 because we start from row 2
      break;
    }
  }
  
  if (targetRow === -1) {
    console.error('[TRANSFER NOTE] Client not found in tracker');
    return { success: false };
  }
  
  // 3. Get existing client notes (Column AL, index 37)
  const clientRowIndex = targetRow - 2;
  const existingNotesStr = data.values[clientRowIndex]?.[37] || '';
  
  // Parse existing notes or create new structure
  let clientNotes: { content: string; markerColor: string; lastUpdated: string } | null = null;
  try {
    if (existingNotesStr) {
      clientNotes = JSON.parse(existingNotesStr);
    }
  } catch {
    // If parsing fails, treat as no existing notes
  }
  
  // 4. Replace client's notes with the transferred note (overwrite, not merge)
  const now = new Date().toISOString();
  
  const mergedNotes = {
    content: noteToTransfer.content,
    markerColor: noteToTransfer.markerColor,
    lastUpdated: now,
  };
  
  // 5. Write to client's Column AL
  const updateRange = encodeURIComponent(`'CLIENT TRACKER'!AL${targetRow}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
  
  const updateResponse = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[JSON.stringify(mergedNotes)]] }),
  });
  
  if (!updateResponse.ok) {
    console.error('[TRANSFER NOTE] Failed to write to client column');
    return { success: false };
  }
  
  // 6. Remove the note from unassigned notes
  await deleteUnassignedBenzoKeepNote(accessToken, spreadsheetId, noteId);
  
  console.log(`[TRANSFER NOTE] Successfully transferred note to row ${targetRow}`);
  return { success: true };
}

// ============= WTN DAILY TASK FUNCTIONS =============

// Get all daily tasks from "WTN TASK" sheet
async function getDailyTasks(accessToken: string, taskSpreadsheetId: string) {
  const range = encodeURIComponent("'WTN TASK'!A2:K5000");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${taskSpreadsheetId}/values/${range}`;
  
  const response = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch daily tasks:', response.status, errorText);
    throw new Error(`Failed to fetch daily tasks: ${response.status}`);
  }

  const data = await response.json();
  if (!data.values) return [];

  return data.values
    .map((row: string[], index: number) => ({
      rowNumber: index + 2,
      dateAD: row[0] || '',
      dateBS: row[1] || '',
      taskName: row[2] || '',
      description: row[3] || '',
      deadline: row[4] || '',
      handler: row[5] || '',
      backupHandler: row[6] || '',
      contactNo: row[7] || '',
      whatsappNo: row[8] || '',
      urgency: parseInt(row[9] || '1', 10) || 1,
      status: row[10] || 'Pending',
    }))
    .filter((task: { taskName: string }) => task.taskName);
}

// Add a new daily task to "WTN TASK" sheet
async function addDailyTask(accessToken: string, taskSpreadsheetId: string, taskData: Record<string, unknown>) {
  const range = encodeURIComponent("'WTN TASK'!A:K");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${taskSpreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const values = [[
    taskData.dateAD || '',
    taskData.dateBS || '',
    taskData.taskName || '',
    taskData.description || '',
    taskData.deadline || '',
    taskData.handler || '',
    taskData.backupHandler || '',
    taskData.contactNo || '',
    taskData.whatsappNo || '',
    String(taskData.urgency || '1'),
    taskData.status || 'Pending',
  ]];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to add daily task:', errorText);
    throw new Error(`Failed to add daily task: ${response.status}`);
  }

  return { success: true };
}

// Update daily task status by row number
async function updateDailyTaskStatus(accessToken: string, taskSpreadsheetId: string, rowNumber: number, newStatus: string) {
  const range = encodeURIComponent(`'WTN TASK'!K${rowNumber}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${taskSpreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[newStatus]] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to update task status:', errorText);
    throw new Error(`Failed to update task status: ${response.status}`);
  }

  return { success: true };
}

// Update full daily task row (columns A-K) by row number
async function updateDailyTask(accessToken: string, taskSpreadsheetId: string, taskData: Record<string, unknown>) {
  const rowNumber = taskData.rowNumber as number;
  const range = encodeURIComponent(`'WTN TASK'!A${rowNumber}:K${rowNumber}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${taskSpreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const values = [[
    taskData.dateAD || '',
    taskData.dateBS || '',
    taskData.taskName || '',
    taskData.description || '',
    taskData.deadline || '',
    taskData.handler || '',
    taskData.backupHandler || '',
    taskData.contactNo || '',
    taskData.whatsappNo || '',
    taskData.urgency || 3,
    taskData.status || 'Pending',
  ]];

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to update task:', errorText);
    throw new Error(`Failed to update task: ${response.status}`);
  }

  return { success: true };
}

// Get handler setup data from "WTN DAILY TASK SETUP DATA" sheet
async function getDailyTaskSetupData(accessToken: string, taskSpreadsheetId: string) {
  const range = encodeURIComponent("'WTN DAILY TASK SETUP DATA'!A2:B100");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${taskSpreadsheetId}/values/${range}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Failed to fetch daily task setup data:', errorText);
    throw new Error(`Failed to fetch daily task setup data: ${response.status}`);
  }

  const data = await response.json();
  if (!data.values) return { handlers: [], handlerWhatsApp: {} };

  const handlers: string[] = [];
  const handlerWhatsApp: Record<string, string> = {};

  for (const row of data.values) {
    const name = row[0]?.trim();
    if (name) {
      handlers.push(name);
      if (row[1]) {
        handlerWhatsApp[name] = row[1].trim();
      }
    }
  }

  return { handlers, handlerWhatsApp };
}

// Extract the latest status from a status log string like "STATUS1 [timestamp]\nSTATUS2 [timestamp]"
function extractLatestStatus(statusLog: string): string {
  if (!statusLog) return '';
  const lines = statusLog.split('\n').filter(l => l.trim());
  if (lines.length === 0) return '';
  const lastLine = lines[0].trim();
  // Extract status before the timestamp bracket
  const bracketIdx = lastLine.indexOf(' [');
  return bracketIdx > 0 ? lastLine.substring(0, bracketIdx).trim() : lastLine;
}

// Get clients for note assignment (both CLIENT TRACKER and BOOKED CLIENTS)
async function getClientsForNoteAssignment(accessToken: string, spreadsheetId: string) {
  const trackerRange = encodeURIComponent("'CLIENT TRACKER'!A2:AL500");
  const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:AL500");
  
  const [trackerResp, bookedResp] = await Promise.all([
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerRange}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ]);

  const mapRows = (rows: string[][], sheetSource: string) =>
    rows
      .map((row: string[], index: number) => ({
        rowNumber: index + 2,
        sheetSource,
        registeredDateTimeAD: row[0] || '',
        clientName: row[2] || '',
        source: row[3] || '',
        contactNo: row[6] || '',
        whatsappNo: row[7] || '',
        events: row[11] || '',
        eventYear: row[12] || '',
        eventMonth: row[13] || '',
        eventDay: row[14] || '',
        initialStatus: extractLatestStatus(row[22] || ''),
        clientHandler: row[23] || '',
        benzoKeepNotes: row[37] || '',
      }))
      .filter((c: { clientName: string }) => c.clientName);

  const trackerClients = trackerResp.ok ? mapRows((await trackerResp.json()).values || [], 'tracker') : [];
  const bookedClients = bookedResp.ok ? mapRows((await bookedResp.json()).values || [], 'booked') : [];

  // Merge & deduplicate: booked wins over tracker
  const clientMap = new Map<string, any>();
  for (const c of trackerClients) clientMap.set(c.registeredDateTimeAD, c);
  for (const c of bookedClients) clientMap.set(c.registeredDateTimeAD, c); // overwrite tracker
  return Array.from(clientMap.values());
}

// Assign a new Benzo Keep note directly to a client's Column AL (without going through unassigned pool)
async function assignBenzoKeepNoteToClient(
  accessToken: string,
  spreadsheetId: string,
  registeredDateTimeAD: string,
  notesData: string
): Promise<{ success: boolean }> {
  console.log(`[ASSIGN NOTE] Assigning note to client: ${registeredDateTimeAD}`);
  
  // Find the client row by registeredDateTimeAD
  const searchRange = encodeURIComponent("'CLIENT TRACKER'!A2:A1000");
  const searchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${searchRange}`;
  
  const searchResponse = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!searchResponse.ok) {
    console.error('[ASSIGN NOTE] Failed to search for client');
    return { success: false };
  }
  
  const searchData = await searchResponse.json();
  if (!searchData.values) {
    console.error('[ASSIGN NOTE] No data in tracker');
    return { success: false };
  }
  
  // Find the row with matching registeredDateTimeAD
  let targetRow = -1;
  for (let i = 0; i < searchData.values.length; i++) {
    if (searchData.values[i][0] === registeredDateTimeAD) {
      targetRow = i + 2; // +2 because of 0-index and header row
      break;
    }
  }
  
  let targetSheet = "'CLIENT TRACKER'";
  
  if (targetRow === -1) {
    // Fallback: search BOOKED CLIENTS sheet
    console.log(`[ASSIGN NOTE] Not found in tracker, searching BOOKED CLIENTS...`);
    const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:A1000");
    const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`;
    const bookedResponse = await fetch(bookedUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (bookedResponse.ok) {
      const bookedData = await bookedResponse.json();
      if (bookedData.values) {
        for (let i = 0; i < bookedData.values.length; i++) {
          if (bookedData.values[i][0] === registeredDateTimeAD) {
            targetRow = i + 2;
            targetSheet = "'BOOKED CLIENTS'";
            console.log(`[ASSIGN NOTE] Found in BOOKED CLIENTS at row ${targetRow}`);
            break;
          }
        }
      }
    }
  }
  
  if (targetRow === -1) {
    console.error(`[ASSIGN NOTE] Client not found in either sheet: ${registeredDateTimeAD}`);
    return { success: false };
  }
  
  // Get existing notes from Column AL
  const alRange = encodeURIComponent(`${targetSheet}!AL${targetRow}`);
  const alUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${alRange}`;
  
  const alResponse = await fetch(alUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  let existingContent = '';
  if (alResponse.ok) {
    const alData = await alResponse.json();
    if (alData.values && alData.values[0] && alData.values[0][0]) {
      try {
        const parsed = JSON.parse(alData.values[0][0]);
        existingContent = parsed.content || '';
      } catch {
        // Plain text
        existingContent = alData.values[0][0];
      }
    }
  }
  
  // Parse the new note data
  let newNoteData: { content: string; markerColor: string; lastUpdated: string };
  try {
    newNoteData = JSON.parse(notesData);
  } catch {
    console.error('[ASSIGN NOTE] Invalid note data format');
    return { success: false };
  }
  
  // Replace existing content with new note (overwrite, not merge)
  const now = new Date().toISOString();
  const finalNotes = {
    content: newNoteData.content,
    markerColor: newNoteData.markerColor,
    lastUpdated: now,
  };
  
  // Write to Column AL
  const updateRange = encodeURIComponent(`${targetSheet}!AL${targetRow}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
  
  const updateResponse = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[JSON.stringify(finalNotes)]] }),
  });
  
  if (!updateResponse.ok) {
    console.error('[ASSIGN NOTE] Failed to write to client column');
    return { success: false };
  }
  
  console.log(`[ASSIGN NOTE] Successfully assigned note to row ${targetRow}`);
  return { success: true };
}

// Get parlour types from EVENT DETAILS SETUP DATA sheet (Column C, starting from row 2)
async function getParlourTypes(accessToken: string, spreadsheetId: string) {
  const range = encodeURIComponent("'EVENT DETAILS SETUP DATA'!C2:C100");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (getParlourTypes):', response.status, errorText);
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (!data.values) return [];
  
  // Extract parlour types from Column C, filter empty values
  return data.values.map((row: string[]) => row[0]).filter(Boolean);
}

// Get parlours from a specific type sheet (e.g., "MAKEUP STUDIO", "BEAUTY PARLOUR")
// Schema: A: NAME, B: COMPANY WHATSAPP, C: COMPANY CONTACT, D: OWNER 1, E: OWNER 1 CONTACT,
//         F: OWNER 1 WHATSAPP, G: OWNER 2, H: OWNER 2 CONTACT, I: OWNER 2 WHATSAPP,
//         J: CITY, K: AREA, L: GOOGLE MAP, M: INSTAGRAM, N: FACEBOOK, O: TIKTOK,
//         P: YOUTUBE, Q: WEBSITE, R: GMAIL, S: RATING
async function getParloursByType(accessToken: string, spreadsheetId: string, parlourType: string) {
  if (!parlourType) return [];
  
  const sheetName = parlourType.toUpperCase();
  const range = encodeURIComponent(`'${sheetName}'!A2:S500`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google Sheets API error (getParloursByType - ${sheetName}):`, response.status, errorText);
    // If sheet doesn't exist, return empty array instead of throwing
    if (response.status === 400 || errorText.includes('Unable to parse range')) {
      return [];
    }
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (!data.values) return [];
  
  return data.values.map((row: string[], index: number) => ({
    rowNumber: index + 2,
    name: row[0] || '',
    companyWhatsapp: row[1] || '',
    companyContact: row[2] || '',
    owner1: row[3] || '',
    owner1Contact: row[4] || '',
    owner1Whatsapp: row[5] || '',
    owner2: row[6] || '',
    owner2Contact: row[7] || '',
    owner2Whatsapp: row[8] || '',
    city: row[9] || '',
    area: row[10] || '',
    googleMap: row[11] || '',
    instagram: row[12] || '',
    facebook: row[13] || '',
    tiktok: row[14] || '',
    youtube: row[15] || '',
    website: row[16] || '',
    gmail: row[17] || '',
    rating: row[18] || '',
  })).filter((parlour: { name: string }) => parlour.name); // Filter out empty rows
}

// Add a new parlour entry to the type-specific sheet
async function addParlourEntry(
  accessToken: string, 
  spreadsheetId: string, 
  parlourType: string, 
  parlourData: { name: string; city: string; area: string; googleMap: string }
) {
  if (!parlourType || !parlourData.name) {
    throw new Error('Parlour type and name are required');
  }

  const sheetName = parlourType.toUpperCase();
  const range = encodeURIComponent(`'${sheetName}'!A:S`);
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  // Build the row with values in correct columns
  // A: NAME, B-I: empty, J: CITY, K: AREA, L: GOOGLE MAP, M-S: empty
  const newRow = [
    parlourData.name,     // A: NAME
    '',                   // B: COMPANY WHATSAPP
    '',                   // C: COMPANY CONTACT
    '',                   // D: OWNER 1
    '',                   // E: OWNER 1 CONTACT
    '',                   // F: OWNER 1 WHATSAPP
    '',                   // G: OWNER 2
    '',                   // H: OWNER 2 CONTACT
    '',                   // I: OWNER 2 WHATSAPP
    parlourData.city,     // J: CITY
    parlourData.area,     // K: AREA
    parlourData.googleMap,// L: GOOGLE MAP
    '',                   // M: INSTAGRAM
    '',                   // N: FACEBOOK
    '',                   // O: TIKTOK
    '',                   // P: YOUTUBE
    '',                   // Q: WEBSITE
    '',                   // R: GMAIL
    '',                   // S: RATING
  ];

  const response = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [newRow] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google Sheets API error (addParlourEntry - ${sheetName}):`, response.status, errorText);
    throw new Error(`Failed to add parlour: ${response.status}`);
  }

  return { success: true };
}

// ============= REFRESH CLIENT VENDOR DATA =============
// Auto-syncs venue/parlour data (City, Area, Map) from vendor type sheets to client event details
async function refreshClientVendorData(
  accessToken: string,
  spreadsheetId: string,
  registeredDateTimeAD: string
) {
  console.info(`[VENDOR REFRESH] Starting refresh for client: ${registeredDateTimeAD}`);
  
  // 1. Get client's current event details
  const clientData = await getClientEventDetails(accessToken, spreadsheetId, registeredDateTimeAD);
  
  if (!clientData.events || clientData.events.length === 0) {
    console.info('[VENDOR REFRESH] No events found for client');
    return { success: true, refreshed: false, eventsUpdated: 0 };
  }

  let eventsUpdated = 0;
  
  // 2. For each event, check and refresh vendor data
  for (const event of clientData.events) {
    let hasChanges = false;
    const updates: Record<string, string> = {};
    
    // Check venue data
    if (event.venueType && event.venueName) {
      try {
        const venues = await getVenuesByType(accessToken, spreadsheetId, event.venueType);
        const matchingVenue = venues.find(
          (v: { name: string }) => v.name.toLowerCase() === event.venueName.toLowerCase()
        );
        
        if (matchingVenue) {
          // Only update if vendor has a value AND it differs from stored
          if (matchingVenue.city && matchingVenue.city !== event.venueCity) {
            updates.venueCity = matchingVenue.city;
            hasChanges = true;
          }
          if (matchingVenue.area && matchingVenue.area !== event.venueArea) {
            updates.venueArea = matchingVenue.area;
            hasChanges = true;
          }
          if (matchingVenue.googleMap && matchingVenue.googleMap !== event.venueMap) {
            updates.venueMap = matchingVenue.googleMap;
            hasChanges = true;
          }
        }
      } catch (err) {
        console.warn(`[VENDOR REFRESH] Error fetching venue type ${event.venueType}:`, err);
      }
    }
    
    // Check parlour data
    if (event.parlourType && event.parlourName) {
      try {
        const parlours = await getParloursByType(accessToken, spreadsheetId, event.parlourType);
        const matchingParlour = parlours.find(
          (p: { name: string }) => p.name.toLowerCase() === event.parlourName.toLowerCase()
        );
        
        if (matchingParlour) {
          // Only update if vendor has a value AND it differs from stored
          if (matchingParlour.city && matchingParlour.city !== event.parlourCity) {
            updates.parlourCity = matchingParlour.city;
            hasChanges = true;
          }
          if (matchingParlour.area && matchingParlour.area !== event.parlourArea) {
            updates.parlourArea = matchingParlour.area;
            hasChanges = true;
          }
          if (matchingParlour.googleMap && matchingParlour.googleMap !== event.parlourMap) {
            updates.parlourMap = matchingParlour.googleMap;
            hasChanges = true;
          }
        }
      } catch (err) {
        console.warn(`[VENDOR REFRESH] Error fetching parlour type ${event.parlourType}:`, err);
      }
    }
    
    // Update if changes found
    if (hasChanges) {
      console.info(`[VENDOR REFRESH] Updating event ${event.eventIndex} with:`, updates);
      await updateClientEventDetails(
        accessToken,
        spreadsheetId,
        registeredDateTimeAD,
        event.eventIndex,
        updates
      );
      eventsUpdated++;
    }
  }

  console.info(`[VENDOR REFRESH] Complete. Events updated: ${eventsUpdated}`);
  return { success: true, refreshed: eventsUpdated > 0, eventsUpdated };
}

// ============= CLIENT CONTACT DETAILS FUNCTIONS =============
// Get client contact details from "BOOKED CLIENTS CONTACT DETAILS" sheet
// Schema: A: registeredDateTimeAD, B: registeredDateBS, C: clientName, D-O: Bride details, P-AA: Groom details, AB: formSentDate
async function getClientContactDetails(
  accessToken: string,
  spreadsheetId: string,
  registeredDateTimeAD: string
) {
  console.info(`[CONTACT DETAILS] Fetching for client: ${registeredDateTimeAD}`);
  
  // 1. Try to find client in BOOKED CLIENTS CONTACT DETAILS by Column A (now A:AB = 28 columns)
  const range = encodeURIComponent("'BOOKED CLIENTS CONTACT DETAILS'!A2:AB1000");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (getClientContactDetails):', response.status, errorText);
    // If sheet doesn't exist or error, return empty data
    if (response.status === 400 || errorText.includes('Unable to parse range')) {
      console.warn('[CONTACT DETAILS] Sheet may not exist, returning empty data');
      return {
        rowNumber: 0,
        registeredDateTimeAD,
        registeredDateBS: '',
        clientName: '',
        brideFullName: '',
        brideContactNumber: '',
        brideWhatsappNumber: '',
        brideBackupNumber: '',
        brideBackupRelation: '',
        brideBackupNumber2: '',
        brideBackupRelation2: '',
        brideInstagram: '',
        brideHomeCity: '',
        brideHomeArea: '',
        brideHomeMap: '',
        brideHomeLandmark: '',
        groomFullName: '',
        groomContactNumber: '',
        groomWhatsappNumber: '',
        groomBackupNumber: '',
        groomBackupRelation: '',
        groomBackupNumber2: '',
        groomBackupRelation2: '',
        groomInstagram: '',
        groomHomeCity: '',
        groomHomeArea: '',
        groomHomeMap: '',
        groomHomeLandmark: '',
        formSentDate: '',
      };
    }
    throw new Error(`Google Sheets API error: ${response.status}`);
  }

  const data = await response.json();
  const rows = data.values || [];
  
  // Find the client by registeredDateTimeAD (Column A)
  let foundRow: string[] | null = null;
  let rowNumber = 0;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if ((row[0] || '').trim() === registeredDateTimeAD.trim()) {
      foundRow = row;
      rowNumber = i + 2; // +2 because we start from row 2
      break;
    }
  }

  // If not found, auto-create from BOOKED CLIENTS
  if (!foundRow) {
    console.info('[CONTACT DETAILS] Client not found, attempting to auto-create from BOOKED CLIENTS');
    
    // Get client data from BOOKED CLIENTS
    const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:C1000");
    const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`;
    const bookedResponse = await fetch(bookedUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (bookedResponse.ok) {
      const bookedData = await bookedResponse.json();
      const bookedRows = bookedData.values || [];
      
      for (const bookedRow of bookedRows) {
        if ((bookedRow[0] || '').trim() === registeredDateTimeAD.trim()) {
          // Found in BOOKED CLIENTS, create new row in CONTACT DETAILS
          const newRow = [
            bookedRow[0] || '', // A: registeredDateTimeAD
            bookedRow[1] || '', // B: registeredDateBS
            bookedRow[2] || '', // C: clientName
            '', '', '', '', '', '', '', '', '', '', '', '', // D-O: Bride (12 fields empty)
            '', '', '', '', '', '', '', '', '', '', '', '', // P-AA: Groom (12 fields empty)
            ''  // AB: formSentDate (empty)
          ];
          
          const appendRange = encodeURIComponent("'BOOKED CLIENTS CONTACT DETAILS'!A:AB");
          const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
          
          const appendResponse = await fetch(appendUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ values: [newRow] }),
          });

          if (appendResponse.ok) {
            const appendResult = await appendResponse.json();
            const updatedRange = appendResult.updates?.updatedRange || '';
            const match = updatedRange.match(/!A(\d+):/);
            rowNumber = match ? parseInt(match[1]) : rows.length + 2;
            
            console.info(`[CONTACT DETAILS] Auto-created row ${rowNumber} for client`);
            
            return {
              rowNumber,
              registeredDateTimeAD: bookedRow[0] || '',
              registeredDateBS: bookedRow[1] || '',
              clientName: bookedRow[2] || '',
              brideFullName: '',
              brideContactNumber: '',
              brideWhatsappNumber: '',
              brideBackupNumber: '',
              brideBackupRelation: '',
              brideBackupNumber2: '',
              brideBackupRelation2: '',
              brideInstagram: '',
              brideHomeCity: '',
              brideHomeArea: '',
              brideHomeMap: '',
              brideHomeLandmark: '',
              groomFullName: '',
              groomContactNumber: '',
              groomWhatsappNumber: '',
              groomBackupNumber: '',
              groomBackupRelation: '',
              groomBackupNumber2: '',
              groomBackupRelation2: '',
              groomInstagram: '',
              groomHomeCity: '',
              groomHomeArea: '',
              groomHomeMap: '',
              groomHomeLandmark: '',
              formSentDate: '',
            };
          }
          break;
        }
      }
    }
    
    // Return empty if client not found anywhere
    return {
      rowNumber: 0,
      registeredDateTimeAD,
      registeredDateBS: '',
      clientName: '',
      brideFullName: '',
      brideContactNumber: '',
      brideWhatsappNumber: '',
      brideBackupNumber: '',
      brideBackupRelation: '',
      brideBackupNumber2: '',
      brideBackupRelation2: '',
      brideInstagram: '',
      brideHomeCity: '',
      brideHomeArea: '',
      brideHomeMap: '',
      brideHomeLandmark: '',
      groomFullName: '',
      groomContactNumber: '',
      groomWhatsappNumber: '',
      groomBackupNumber: '',
      groomBackupRelation: '',
      groomBackupNumber2: '',
      groomBackupRelation2: '',
      groomInstagram: '',
      groomHomeCity: '',
      groomHomeArea: '',
      groomHomeMap: '',
      groomHomeLandmark: '',
      formSentDate: '',
    };
  }

  // Return found data
  return {
    rowNumber,
    registeredDateTimeAD: foundRow[0] || '',
    registeredDateBS: foundRow[1] || '',
    clientName: foundRow[2] || '',
    brideFullName: foundRow[3] || '',
    brideContactNumber: foundRow[4] || '',
    brideWhatsappNumber: foundRow[5] || '',
    brideBackupNumber: foundRow[6] || '',
    brideBackupRelation: foundRow[7] || '',
    brideBackupNumber2: foundRow[8] || '',
    brideBackupRelation2: foundRow[9] || '',
    brideInstagram: foundRow[10] || '',
    brideHomeCity: foundRow[11] || '',
    brideHomeArea: foundRow[12] || '',
    brideHomeMap: foundRow[13] || '',
    brideHomeLandmark: foundRow[14] || '',
    groomFullName: foundRow[15] || '',
    groomContactNumber: foundRow[16] || '',
    groomWhatsappNumber: foundRow[17] || '',
    groomBackupNumber: foundRow[18] || '',
    groomBackupRelation: foundRow[19] || '',
    groomBackupNumber2: foundRow[20] || '',
    groomBackupRelation2: foundRow[21] || '',
    groomInstagram: foundRow[22] || '',
    groomHomeCity: foundRow[23] || '',
    groomHomeArea: foundRow[24] || '',
    groomHomeMap: foundRow[25] || '',
    groomHomeLandmark: foundRow[26] || '',
    formSentDate: foundRow[27] || '',
  };
}

// Update client contact details in "BOOKED CLIENTS CONTACT DETAILS" sheet
async function updateClientContactDetails(
  accessToken: string,
  spreadsheetId: string,
  registeredDateTimeAD: string,
  updates: Record<string, string>
) {
  console.info(`[CONTACT DETAILS UPDATE] Updating for client: ${registeredDateTimeAD}`);
  
  // First, get the current data to find the row
  const currentData = await getClientContactDetails(accessToken, spreadsheetId, registeredDateTimeAD);
  
  if (!currentData.rowNumber) {
    throw new Error('Client not found in contact details sheet');
  }

  const rowNumber = currentData.rowNumber;
  
  // Column mapping: D=3, E=4, ... AA=26
  const columnMap: Record<string, number> = {
    brideFullName: 3,
    brideContactNumber: 4,
    brideWhatsappNumber: 5,
    brideBackupNumber: 6,
    brideBackupRelation: 7,
    brideBackupNumber2: 8,
    brideBackupRelation2: 9,
    brideInstagram: 10,
    brideHomeCity: 11,
    brideHomeArea: 12,
    brideHomeMap: 13,
    brideHomeLandmark: 14,
    groomFullName: 15,
    groomContactNumber: 16,
    groomWhatsappNumber: 17,
    groomBackupNumber: 18,
    groomBackupRelation: 19,
    groomBackupNumber2: 20,
    groomBackupRelation2: 21,
    groomInstagram: 22,
    groomHomeCity: 23,
    groomHomeArea: 24,
    groomHomeMap: 25,
    groomHomeLandmark: 26,
    formSentDate: 27,
  };

  // Build the update row (columns D-AB = 25 columns)
  const rowValues: string[] = new Array(25).fill('');
  
  // Start with current values
  rowValues[0] = currentData.brideFullName;
  rowValues[1] = currentData.brideContactNumber;
  rowValues[2] = currentData.brideWhatsappNumber;
  rowValues[3] = currentData.brideBackupNumber;
  rowValues[4] = currentData.brideBackupRelation;
  rowValues[5] = currentData.brideBackupNumber2;
  rowValues[6] = currentData.brideBackupRelation2;
  rowValues[7] = currentData.brideInstagram;
  rowValues[8] = currentData.brideHomeCity;
  rowValues[9] = currentData.brideHomeArea;
  rowValues[10] = currentData.brideHomeMap;
  rowValues[11] = currentData.brideHomeLandmark;
  rowValues[12] = currentData.groomFullName;
  rowValues[13] = currentData.groomContactNumber;
  rowValues[14] = currentData.groomWhatsappNumber;
  rowValues[15] = currentData.groomBackupNumber;
  rowValues[16] = currentData.groomBackupRelation;
  rowValues[17] = currentData.groomBackupNumber2;
  rowValues[18] = currentData.groomBackupRelation2;
  rowValues[19] = currentData.groomInstagram;
  rowValues[20] = currentData.groomHomeCity;
  rowValues[21] = currentData.groomHomeArea;
  rowValues[22] = currentData.groomHomeMap;
  rowValues[23] = currentData.groomHomeLandmark;
  rowValues[24] = currentData.formSentDate;
  
  // Apply updates
  for (const [key, value] of Object.entries(updates)) {
    const colIndex = columnMap[key];
    if (colIndex !== undefined) {
      rowValues[colIndex - 3] = value; // -3 because rowValues starts at column D (index 3)
    }
  }

  // Update the row (columns D-AB)
  const updateRange = encodeURIComponent(`'BOOKED CLIENTS CONTACT DETAILS'!D${rowNumber}:AB${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [rowValues] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (updateClientContactDetails):', response.status, errorText);
    throw new Error(`Failed to update contact details: ${response.status}`);
  }

  console.info(`[CONTACT DETAILS UPDATE] Successfully updated row ${rowNumber}`);

  // Sync updated data to Supabase contact_details_cache using known data (no re-read from Sheets)
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.2");
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // Build cache update from known currentData + applied updates (no sheet re-read)
    const cacheRecord: Record<string, any> = {
      registered_date_time_ad: registeredDateTimeAD,
      registered_date_bs: currentData.registeredDateBS || '',
      client_name: currentData.clientName || '',
      row_number: currentData.rowNumber || rowNumber || 0,
      bride_full_name: currentData.brideFullName || '',
      bride_contact_number: currentData.brideContactNumber || '',
      bride_whatsapp_number: currentData.brideWhatsappNumber || '',
      bride_backup_number: currentData.brideBackupNumber || '',
      bride_backup_relation: currentData.brideBackupRelation || '',
      bride_backup_number2: currentData.brideBackupNumber2 || '',
      bride_backup_relation2: currentData.brideBackupRelation2 || '',
      bride_instagram: currentData.brideInstagram || '',
      bride_home_city: currentData.brideHomeCity || '',
      bride_home_area: currentData.brideHomeArea || '',
      bride_home_map: currentData.brideHomeMap || '',
      bride_home_landmark: currentData.brideHomeLandmark || '',
      groom_full_name: currentData.groomFullName || '',
      groom_contact_number: currentData.groomContactNumber || '',
      groom_whatsapp_number: currentData.groomWhatsappNumber || '',
      groom_backup_number: currentData.groomBackupNumber || '',
      groom_backup_relation: currentData.groomBackupRelation || '',
      groom_backup_number2: currentData.groomBackupNumber2 || '',
      groom_backup_relation2: currentData.groomBackupRelation2 || '',
      groom_instagram: currentData.groomInstagram || '',
      groom_home_city: currentData.groomHomeCity || '',
      groom_home_area: currentData.groomHomeArea || '',
      groom_home_map: currentData.groomHomeMap || '',
      groom_home_landmark: currentData.groomHomeLandmark || '',
      form_sent_date: currentData.formSentDate || '',
      updated_at: new Date().toISOString(),
    };

    // Apply the updates on top (camelCase keys → snake_case DB columns)
    const camelToSnake: Record<string, string> = {
      brideFullName: 'bride_full_name', brideContactNumber: 'bride_contact_number',
      brideWhatsappNumber: 'bride_whatsapp_number', brideBackupNumber: 'bride_backup_number',
      brideBackupRelation: 'bride_backup_relation', brideBackupNumber2: 'bride_backup_number2',
      brideBackupRelation2: 'bride_backup_relation2', brideInstagram: 'bride_instagram',
      brideHomeCity: 'bride_home_city', brideHomeArea: 'bride_home_area',
      brideHomeMap: 'bride_home_map', brideHomeLandmark: 'bride_home_landmark',
      groomFullName: 'groom_full_name', groomContactNumber: 'groom_contact_number',
      groomWhatsappNumber: 'groom_whatsapp_number', groomBackupNumber: 'groom_backup_number',
      groomBackupRelation: 'groom_backup_relation', groomBackupNumber2: 'groom_backup_number2',
      groomBackupRelation2: 'groom_backup_relation2', groomInstagram: 'groom_instagram',
      groomHomeCity: 'groom_home_city', groomHomeArea: 'groom_home_area',
      groomHomeMap: 'groom_home_map', groomHomeLandmark: 'groom_home_landmark',
      formSentDate: 'form_sent_date',
    };
    for (const [camelKey, val] of Object.entries(updates)) {
      const snakeKey = camelToSnake[camelKey];
      if (snakeKey) cacheRecord[snakeKey] = val || '';
    }

    await supabaseAdmin.from('contact_details_cache').upsert(cacheRecord, { onConflict: 'registered_date_time_ad' });

    console.info(`[CONTACT DETAILS UPDATE] Cache synced for ${registeredDateTimeAD} (from known data, no sheet re-read)`);
  } catch (cacheErr) {
    console.warn(`[CONTACT DETAILS UPDATE] Cache sync failed (non-fatal):`, cacheErr);
  }

  return { success: true, rowNumber };
}

// ============= FULL SYNC CONTACT DETAILS =============
// Syncs ALL booked clients from BOOKED CLIENTS to BOOKED CLIENTS CONTACT DETAILS
// Creates missing entries with A-C synced, D-AA empty
// Updates A-C for existing entries (preserving D-AA user data)
async function fullSyncContactDetails(accessToken: string, spreadsheetId: string) {
  console.info('[CONTACT SYNC] Starting full sync of contact details...');
  
  // 1. Fetch all BOOKED CLIENTS data (A-C)
  const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:C2000");
  const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`;
  
  const bookedResponse = await fetchWithRetry(bookedUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!bookedResponse.ok) {
    throw new Error('Failed to fetch BOOKED CLIENTS data');
  }
  
  const bookedData = await bookedResponse.json();
  const bookedRows = bookedData.values || [];
  
  if (bookedRows.length === 0) {
    console.info('[CONTACT SYNC] No booked clients found');
    return { copiedCount: 0, updatedCount: 0, totalClients: 0 };
  }
  
  // 2. Fetch existing CONTACT DETAILS entries (now including column AB)
  const contactRange = encodeURIComponent("'BOOKED CLIENTS CONTACT DETAILS'!A2:AB2000");
  const contactUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${contactRange}`;
  
  const contactResponse = await fetch(contactUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  // Handle case where sheet might not exist or be empty
  let contactRows: string[][] = [];
  if (contactResponse.ok) {
    const contactData = await contactResponse.json();
    contactRows = contactData.values || [];
  }
  
  // 3. Build map of existing entries by registeredDateTimeAD
  const existingMap = new Map<string, { rowNumber: number; row: string[] }>();
  for (let i = 0; i < contactRows.length; i++) {
    const row = contactRows[i];
    if (row[0]) {
      existingMap.set(row[0].trim(), { rowNumber: i + 2, row });
    }
  }
  
  let copiedCount = 0;
  let updatedCount = 0;
  const newRows: string[][] = [];
  
  // 4. Process each booked client
  for (const bookedRow of bookedRows) {
    const registeredDateTimeAD = bookedRow[0]?.trim();
    if (!registeredDateTimeAD) continue;
    
    const existing = existingMap.get(registeredDateTimeAD);
    
    if (!existing) {
      // Create new row with A-C synced, D-AB empty
      const newRow = [
        bookedRow[0] || '', // A: registeredDateTimeAD
        bookedRow[1] || '', // B: registeredDateBS
        bookedRow[2] || '', // C: clientName
        '', '', '', '', '', '', '', '', '', '', '', '', // D-O: Bride (12 fields empty)
        '', '', '', '', '', '', '', '', '', '', '', '', // P-AA: Groom (12 fields empty)
        ''  // AB: formSentDate (empty)
      ];
      newRows.push(newRow);
      copiedCount++;
    } else {
      // Check if A-C needs updating
      const needsUpdate = 
        existing.row[1] !== bookedRow[1] || 
        existing.row[2] !== bookedRow[2];
      
      if (needsUpdate) {
        // Update columns A-C (preserve D-AA)
        const updateRange = encodeURIComponent(`'BOOKED CLIENTS CONTACT DETAILS'!A${existing.rowNumber}:C${existing.rowNumber}`);
        const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
        
        await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [[bookedRow[0], bookedRow[1], bookedRow[2]]] }),
        });
        updatedCount++;
      }
    }
  }
  
  // 5. Batch append new rows
  if (newRows.length > 0) {
    const appendRange = encodeURIComponent("'BOOKED CLIENTS CONTACT DETAILS'!A:AB");
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    
    await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: newRows }),
    });
  }
  
  // 6. Deduplication pass: remove any duplicate registeredDateTimeAD entries
  let dedupCount = 0;
  const dedupRange2 = encodeURIComponent("'BOOKED CLIENTS CONTACT DETAILS'!A2:A2000");
  const dedupResp2 = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${dedupRange2}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (dedupResp2.ok) {
    const dedupData2 = await dedupResp2.json();
    const dedupRows2: string[][] = dedupData2.values || [];
    const seenIds2 = new Set<string>();
    const dupeRowNumbers2: number[] = [];

    dedupRows2.forEach((r: string[], idx: number) => {
      const key = (r[0] || '').trim();
      if (!key) return;
      if (seenIds2.has(key)) {
        dupeRowNumbers2.push(idx + 2);
      } else {
        seenIds2.add(key);
      }
    });

    if (dupeRowNumbers2.length > 0) {
      const sheetIdDedup = await getSheetId(accessToken, spreadsheetId, 'BOOKED CLIENTS CONTACT DETAILS');
      const sortedDupes2 = dupeRowNumbers2.sort((a, b) => b - a);
      const dedupRequests2 = sortedDupes2.map(rowNum => ({
        deleteDimension: {
          range: { sheetId: sheetIdDedup, dimension: 'ROWS', startIndex: rowNum - 1, endIndex: rowNum }
        }
      }));
      await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: dedupRequests2 }),
      });
      dedupCount = dupeRowNumbers2.length;
      console.log(`[CONTACT SYNC] Removed ${dedupCount} duplicate rows`);
    }
  }

  // 7. Cleanup: remove rows from CONTACT DETAILS that are NOT in BOOKED CLIENTS
  let removedCount = 0;
  const validBookedIds = new Set(
    bookedRows.map((row: string[]) => (row[0] || '').trim()).filter(Boolean)
  );

  // Re-read CONTACT DETAILS column A to get current state (after dedup)
  const cleanupRange2 = encodeURIComponent("'BOOKED CLIENTS CONTACT DETAILS'!A2:A2000");
  const cleanupResponse2 = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${cleanupRange2}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (cleanupResponse2.ok) {
    const cleanupData2 = await cleanupResponse2.json();
    const cdRows: string[][] = cleanupData2.values || [];
    const rowsToDelete: number[] = [];

    cdRows.forEach((r: string[], idx: number) => {
      const key = (r[0] || '').trim();
      if (key && !validBookedIds.has(key)) {
        rowsToDelete.push(idx + 2);
      }
    });

    if (rowsToDelete.length > 0) {
      const sheetId = await getSheetId(accessToken, spreadsheetId, 'BOOKED CLIENTS CONTACT DETAILS');
      const sortedRows = rowsToDelete.sort((a, b) => b - a);
      const requests = sortedRows.map(rowNum => ({
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowNum - 1, endIndex: rowNum }
        }
      }));
      await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      });
      removedCount = rowsToDelete.length;
      console.log(`[CONTACT SYNC] Removed ${removedCount} stale rows (not in BOOKED CLIENTS)`);
    }
  }

  console.info(`[CONTACT SYNC] Complete: ${copiedCount} created, ${updatedCount} updated, ${dedupCount} deduped, ${removedCount} removed, ${bookedRows.length} total`);
  return { copiedCount, updatedCount, dedupCount, removedCount, totalClients: bookedRows.length };
}

// ============= RESYNC CLIENT CONTACT DETAILS =============
// Force-refresh A-C data from BOOKED CLIENTS for a single client
async function resyncClientContactDetails(
  accessToken: string,
  spreadsheetId: string,
  registeredDateTimeAD: string
) {
  console.info(`[CONTACT RESYNC] Resyncing client: ${registeredDateTimeAD}`);
  
  // 1. Find client in BOOKED CLIENTS
  const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:C2000");
  const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`;
  
  const bookedResponse = await fetch(bookedUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!bookedResponse.ok) {
    throw new Error('Failed to fetch BOOKED CLIENTS data');
  }
  
  const bookedData = await bookedResponse.json();
  const bookedRows = bookedData.values || [];
  
  let bookedClient: string[] | null = null;
  for (const row of bookedRows) {
    if (row[0]?.trim() === registeredDateTimeAD.trim()) {
      bookedClient = row;
      break;
    }
  }
  
  if (!bookedClient) {
    throw new Error('Client not found in BOOKED CLIENTS');
  }
  
  // 2. Find or create client in CONTACT DETAILS
  const contactRange = encodeURIComponent("'BOOKED CLIENTS CONTACT DETAILS'!A2:AA2000");
  const contactUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${contactRange}`;
  
  const contactResponse = await fetch(contactUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  let contactRows: string[][] = [];
  if (contactResponse.ok) {
    const contactData = await contactResponse.json();
    contactRows = contactData.values || [];
  }
  
  let rowNumber = 0;
  for (let i = 0; i < contactRows.length; i++) {
    if (contactRows[i][0]?.trim() === registeredDateTimeAD.trim()) {
      rowNumber = i + 2;
      break;
    }
  }
  
  if (rowNumber === 0) {
    // Create new row
    const newRow = [
      bookedClient[0] || '',
      bookedClient[1] || '',
      bookedClient[2] || '',
      '', '', '', '', '', '', '', '', '', '', '', '',
      '', '', '', '', '', '', '', '', '', '', '', ''
    ];
    
    const appendRange = encodeURIComponent("'BOOKED CLIENTS CONTACT DETAILS'!A:AA");
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    
    await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [newRow] }),
    });
    
    console.info('[CONTACT RESYNC] Created new entry');
  } else {
    // Update A-C columns
    const updateRange = encodeURIComponent(`'BOOKED CLIENTS CONTACT DETAILS'!A${rowNumber}:C${rowNumber}`);
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
    
    await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [[bookedClient[0], bookedClient[1], bookedClient[2]]] }),
    });
    
    console.info(`[CONTACT RESYNC] Updated row ${rowNumber}`);
  }
  
  // 3. Fetch and return refreshed data
  return await getClientContactDetails(accessToken, spreadsheetId, registeredDateTimeAD);
}


// Schema: A: NAME, B: COMPANY WHATSAPP, C: COMPANY CONTACT, D: OWNER 1, E: OWNER 1 CONTACT,
//         F: OWNER 1 WHATSAPP, G: OWNER 2, H: OWNER 2 CONTACT, I: OWNER 2 WHATSAPP,
//         J: CITY, K: AREA, L: GOOGLE MAP, M: INSTAGRAM, N: FACEBOOK, O: TIKTOK,
//         P: YOUTUBE, Q: WEBSITE, R: GMAIL, S: RATING
async function getVenuesByType(accessToken: string, spreadsheetId: string, venueType: string) {
  if (!venueType) return [];
  
  const sheetName = venueType.toUpperCase();
  const range = encodeURIComponent(`'${sheetName}'!A2:S500`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google Sheets API error (getVenuesByType - ${sheetName}):`, response.status, errorText);
    // If sheet doesn't exist, return empty array instead of throwing
    if (response.status === 400 || errorText.includes('Unable to parse range')) {
      return [];
    }
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (!data.values) return [];
  
  return data.values.map((row: string[], index: number) => ({
    rowNumber: index + 2,
    name: row[0] || '',
    companyWhatsapp: row[1] || '',
    companyContact: row[2] || '',
    owner1: row[3] || '',
    owner1Contact: row[4] || '',
    owner1Whatsapp: row[5] || '',
    owner2: row[6] || '',
    owner2Contact: row[7] || '',
    owner2Whatsapp: row[8] || '',
    city: row[9] || '',
    area: row[10] || '',
    googleMap: row[11] || '',
    instagram: row[12] || '',
    facebook: row[13] || '',
    tiktok: row[14] || '',
    youtube: row[15] || '',
    website: row[16] || '',
    gmail: row[17] || '',
    rating: row[18] || '',
  })).filter((venue: { name: string }) => venue.name); // Filter out empty rows
}

// Add a new venue entry to the type-specific sheet
async function addVenueEntry(
  accessToken: string, 
  spreadsheetId: string, 
  venueType: string, 
  venueData: { name: string; city: string; area: string; googleMap: string }
) {
  if (!venueType || !venueData.name) {
    throw new Error('Venue type and name are required');
  }

  const sheetName = venueType.toUpperCase();
  const range = encodeURIComponent(`'${sheetName}'!A:S`);
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  // Build the row with values in correct columns
  // A: NAME, B-I: empty, J: CITY, K: AREA, L: GOOGLE MAP, M-S: empty
  const newRow = [
    venueData.name,     // A: NAME
    '',                 // B: COMPANY WHATSAPP
    '',                 // C: COMPANY CONTACT
    '',                 // D: OWNER 1
    '',                 // E: OWNER 1 CONTACT
    '',                 // F: OWNER 1 WHATSAPP
    '',                 // G: OWNER 2
    '',                 // H: OWNER 2 CONTACT
    '',                 // I: OWNER 2 WHATSAPP
    venueData.city,     // J: CITY
    venueData.area,     // K: AREA
    venueData.googleMap,// L: GOOGLE MAP
    '',                 // M: INSTAGRAM
    '',                 // N: FACEBOOK
    '',                 // O: TIKTOK
    '',                 // P: YOUTUBE
    '',                 // Q: WEBSITE
    '',                 // R: GMAIL
    '',                 // S: RATING
  ];

  const response = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [newRow] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Google Sheets API error (addVenueEntry - ${sheetName}):`, response.status, errorText);
    throw new Error(`Failed to add venue: ${response.status}`);
  }

  return { success: true };
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

// ============= ACTIVITY LOG HELPERS (Column AJ) =============
// Generate Nepal timezone timestamp for activity logging
function getNepalTimestamp(): string {
  const now = new Date();
  const nepalOffset = 5 * 60 + 45; // 5:45 in minutes
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const nepalTime = new Date(utcTime + (nepalOffset * 60000));
  
  const month = String(nepalTime.getMonth() + 1).padStart(2, '0');
  const day = String(nepalTime.getDate()).padStart(2, '0');
  const year = nepalTime.getFullYear();
  const hours = String(nepalTime.getHours()).padStart(2, '0');
  const mins = String(nepalTime.getMinutes()).padStart(2, '0');
  const secs = String(nepalTime.getSeconds()).padStart(2, '0');
  
  return `${month}/${day}/${year} ${hours}:${mins}:${secs}`;
}

// Fetch current activity log from Column AJ
async function getCurrentActivityLog(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number
): Promise<string> {
  const range = encodeURIComponent(`'${sheetName}'!AJ${rowNumber}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!response.ok) return '';
    
    const data = await response.json();
    return data.values?.[0]?.[0] || '';
  } catch {
    return '';
  }
}

// Append a new activity entry to Column AJ (newest entry on top)
async function appendActivityLog(
  accessToken: string,
  spreadsheetId: string,
  sheetName: 'CLIENT TRACKER' | 'BOOKED CLIENTS',
  rowNumber: number,
  activityType: string,
  details: string,
  existingLog?: string
): Promise<string> {
  // Fetch existing log if not provided
  const currentLog = existingLog !== undefined ? existingLog : await getCurrentActivityLog(accessToken, spreadsheetId, sheetName, rowNumber);
  
  // Generate timestamp
  const timestamp = getNepalTimestamp();
  
  // Truncate details to 100 chars max
  const truncatedDetails = details.length > 100 ? details.substring(0, 100) + '...' : details;
  
  // Format: "MM/DD/YYYY HH:MM:SS | ACTIVITY_TYPE | Details"
  const newEntry = `${timestamp} | ${activityType} | ${truncatedDetails}`;
  
  // Prepend new entry (newest on top)
  const updatedLog = currentLog ? `${newEntry}\n${currentLog}` : newEntry;
  
  // Write to Column AJ
  const range = encodeURIComponent(`'${sheetName}'!AJ${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  try {
    await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [[updatedLog]] }),
    });
    
    console.log(`[ACTIVITY LOG] ${sheetName} row ${rowNumber}: ${activityType} - ${truncatedDetails.substring(0, 30)}...`);
  } catch (err) {
    console.error('[ACTIVITY LOG] Failed to append activity:', err);
  }
  
  return updatedLog;
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
  // Allow ID-based resolution even when rowNumber is invalid
  if ((!rowNumber || rowNumber < 2) && !registeredDateTimeAD) {
    throw new Error('Valid rowNumber or registeredDateTimeAD is required for updating status');
  }

  // Intelligent sheet routing: search BOOKED CLIENTS first, then CLIENT TRACKER
  let targetSheet = 'CLIENT TRACKER';
  let actualRowNumber = rowNumber;

  if (registeredDateTimeAD) {
    const bookedRow = await verifyRowNumber(accessToken, spreadsheetId, 'BOOKED CLIENTS', -1, registeredDateTimeAD);
    if (bookedRow !== -1) {
      targetSheet = 'BOOKED CLIENTS';
      actualRowNumber = bookedRow;
      console.log(`updateClientStatus: Found client in BOOKED CLIENTS at row ${bookedRow}`);
    } else {
      const trackerRow = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);
      if (trackerRow >= 2) {
        actualRowNumber = trackerRow;
        console.log(`updateClientStatus: Found client in CLIENT TRACKER at row ${actualRowNumber}`);
      } else {
        throw new Error(`Client not found in any sheet by registeredDateTimeAD: ${registeredDateTimeAD}`);
      }
    }
  } else {
    console.log(`updateClientStatus: No registeredDateTimeAD provided, using raw rowNumber ${rowNumber} on CLIENT TRACKER`);
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

  const range = encodeURIComponent(`'${targetSheet}'!W${actualRowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetchWithRetry(updateUrl, {
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

  // If status is BOOKED and client is in CLIENT TRACKER, MOVE to BOOKED CLIENTS sheet
  let movedToBooked = false;
  if (newStatus.toUpperCase() === 'BOOKED' && targetSheet === 'CLIENT TRACKER') {
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
      // First copy to BOOKED CLIENTS
      await copyToBookedClients(accessToken, spreadsheetId, actualRowNumber);
      console.log(`[STATUS CHANGE] Client at row ${actualRowNumber} copied to BOOKED CLIENTS`);
      
      // Then DELETE from CLIENT TRACKER (MOVE operation)
      await deleteTrackerRow(accessToken, spreadsheetId, actualRowNumber);
      console.log(`[STATUS CHANGE] Client DELETED from CLIENT TRACKER row ${actualRowNumber} - MOVED to BOOKED CLIENTS`);
      
      movedToBooked = true;

      // --- CRITICAL: Patch payment columns (AE/AF/AG) on the new booked row from DB ---
      // The tracker sheet has empty payment columns. The DB has the correct payment data
      // written by migrateClientToBookedInCache. We MUST patch the booked sheet immediately.
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.2");
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        
        const { data: dbRow } = await supabaseAdmin
          .from('clients_cache')
          .select('payments_made, payment_dates_ad, remaining_payment')
          .eq('registered_date_time_ad', fetchedRegisteredDateTime)
          .maybeSingle();

        if (dbRow && (dbRow.payments_made || dbRow.payment_dates_ad || dbRow.remaining_payment)) {
          const bookedRowForPatch = await findBookedClientRow(accessToken, spreadsheetId, fetchedRegisteredDateTime);
          if (bookedRowForPatch) {
            const patchRange = encodeURIComponent(`'BOOKED CLIENTS'!AE${bookedRowForPatch}:AG${bookedRowForPatch}`);
            const patchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${patchRange}?valueInputOption=USER_ENTERED`;
            await fetchWithRetry(patchUrl, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                values: [[
                  dbRow.payments_made || '',
                  dbRow.payment_dates_ad || '',
                  dbRow.remaining_payment || '',
                ]],
              }),
            });
            console.log(`[BOOKED MOVE] Patched payment columns AE/AF/AG on booked row ${bookedRowForPatch} from DB`);
          }
        }
      } catch (patchErr) {
        console.warn(`[BOOKED MOVE] Payment patch failed (non-critical, DB has correct data):`, patchErr);
      }

      // --- Trigger downstream sync to all 3 dependent sheets ---
      try {
        await syncToEventDetails(accessToken, spreadsheetId, fetchedRegisteredDateTime);
        console.log(`[STATUS CHANGE] Synced to EVENT DETAILS`);
      } catch (evErr) {
        console.warn(`[STATUS CHANGE] EVENT DETAILS sync failed:`, evErr);
      }

      try {
        await syncSingleClientToFreelancers(accessToken, spreadsheetId, fetchedRegisteredDateTime);
        console.log(`[STATUS CHANGE] Synced to FREELANCERS`);
      } catch (flErr) {
        console.warn(`[STATUS CHANGE] FREELANCERS sync failed:`, flErr);
      }

      try {
        await resyncClientContactDetails(accessToken, spreadsheetId, fetchedRegisteredDateTime);
        console.log(`[STATUS CHANGE] Synced to CONTACT DETAILS`);
      } catch (cdErr) {
        console.warn(`[STATUS CHANGE] CONTACT DETAILS sync failed:`, cdErr);
      }

      // Log activity to BOOKED CLIENTS (the client was moved there)
      const bookedRow = await findBookedClientRow(accessToken, spreadsheetId, fetchedRegisteredDateTime);
      if (bookedRow) {
        await appendActivityLog(accessToken, spreadsheetId, 'BOOKED CLIENTS', bookedRow, 'STATUS_CHANGE', newStatus);
      }
    }
  }
  
  // Log activity to correct sheet if client is still there (not moved)
  if (!movedToBooked) {
    await appendActivityLog(accessToken, spreadsheetId, targetSheet as 'CLIENT TRACKER' | 'BOOKED CLIENTS', actualRowNumber, 'STATUS_CHANGE', newStatus);
  }

  return { success: true, statusLog: updatedLog, copiedToBooked: movedToBooked, movedToBooked, actualRowNumber };
}

// Get recent clients (now including Column W for status, Column X for handler, Column Y for call log, Column Z for mindset, AA/AB for bargaining, AC for comments, AD for final quotation, AE/AF/AG for payments, AH for company name, AI for service types)
// NOTE: This returns ONLY clients from CLIENT TRACKER (which now excludes BOOKED clients after migration)
// For unified data including BOOKED clients, use getAllClientsFromBothSheets
async function getClients(accessToken: string, spreadsheetId: string, limit = 50) {
  const range = encodeURIComponent("'CLIENT TRACKER'!A2:AL" + (limit + 1));
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
    lastActivityLog: row[35] || '',       // Column AJ - Last activity timestamp log
    priority: row[36] || '',              // Column AK - Star rating (1-5)
    benzoKeepNotes: row[37] || '',        // Column AL - Benzo Keep notes (JSON)
    _source: 'tracker' as const,          // Source indicator for unified queries
  }));
}

// ============= GET SINGLE CLIENT BY UNIQUE ID =============
// Searches both CLIENT TRACKER and BOOKED CLIENTS for a specific client by registeredDateTimeAD
async function getSingleClient(accessToken: string, spreadsheetId: string, registeredDateTimeAD: string) {
  if (!registeredDateTimeAD) {
    throw new Error('registeredDateTimeAD is required for getSingleClient');
  }

  console.info(`[SINGLE CLIENT] Fetching client: ${registeredDateTimeAD}`);

  // Helper to map row to client data format
  const mapRowToClient = (row: string[], rowNumber: number, source: 'tracker' | 'booked') => ({
    rowNumber,
    registeredDateTimeAD: row[0] || '',
    registeredDateBS: row[1] || '',
    clientName: row[2] || '',
    source: row[3] || '',
    clientLocation: row[4] || '',
    currentCountry: row[5] || '',
    contactNo: row[6] || '',
    whatsappNo: row[7] || '',
    email: row[8] || '',
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
    quotationData: row[21] || '',
    statusLog: row[22] || '',
    clientHandler: row[23] || '',
    callLog: row[24] || '',
    mindset: row[25] || '',
    ourBargainedRates: row[26] || '',
    clientBargainedRates: row[27] || '',
    comments: row[28] || '',
    finalQuotation: row[29] || '',
    paymentsMade: row[30] || '',
    paymentDatesAD: row[31] || '',
    remainingPayment: row[32] || '',
    companyName: row[33] || '',
    serviceTypes: row[34] || '',
    lastActivityLog: row[35] || '',       // Column AJ - Last activity timestamp log
    priority: row[36] || '',              // Column AK - Star rating (1-5)
    benzoKeepNotes: row[37] || '',        // Column AL - Benzo Keep notes (JSON)
    _source: source,
  });

  // PRIORITY: Search BOOKED CLIENTS FIRST (booked wins over tracker duplicates)
  const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:AL2000");
  const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`;
  
  const bookedResponse = await fetch(bookedUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (bookedResponse.ok) {
    const bookedData = await bookedResponse.json();
    if (bookedData.values) {
      const foundIndex = bookedData.values.findIndex((row: string[]) => row[0] === registeredDateTimeAD);
      if (foundIndex !== -1) {
        console.info(`[SINGLE CLIENT] Found in BOOKED CLIENTS at row ${foundIndex + 2}`);
        return mapRowToClient(bookedData.values[foundIndex], foundIndex + 2, 'booked');
      }
    }
  }

  // Not found in BOOKED CLIENTS, search CLIENT TRACKER
  const trackerRange = encodeURIComponent("'CLIENT TRACKER'!A2:AL2000");
  const trackerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerRange}`;
  
  const trackerResponse = await fetch(trackerUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (trackerResponse.ok) {
    const trackerData = await trackerResponse.json();
    if (trackerData.values) {
      const foundIndex = trackerData.values.findIndex((row: string[]) => row[0] === registeredDateTimeAD);
      if (foundIndex !== -1) {
        console.info(`[SINGLE CLIENT] Found in CLIENT TRACKER at row ${foundIndex + 2}`);
        return mapRowToClient(trackerData.values[foundIndex], foundIndex + 2, 'tracker');
      }
    }
  }

  console.info(`[SINGLE CLIENT] Client not found in any sheet`);
  return null;
}

// ============= GET ALL CLIENTS FROM BOTH SHEETS (UNIFIED) =============
// Merges data from CLIENT TRACKER (non-BOOKED) and BOOKED CLIENTS
// This is the primary endpoint for features like Hot Dates, Calendar, Search
// IMPORTANT: Deduplicates by registeredDateTimeAD, prioritizing BOOKED CLIENTS
async function getAllClientsFromBothSheets(accessToken: string, spreadsheetId: string, limit = 500) {
  // Fetch from both sheets in parallel
  const [trackerClients, bookedClients] = await Promise.all([
    getClients(accessToken, spreadsheetId, limit),
    getBookedClients(accessToken, spreadsheetId, limit),
  ]);
  
  // Map booked clients to unified format
  const mappedBookedClients = bookedClients.map((client: Record<string, unknown>) => ({
    ...client,
    rowNumber: client.bookedRowNumber, // Use bookedRowNumber as the primary rowNumber
    _source: 'booked' as const,        // Source indicator
  }));
  
  // Merge both lists
  const merged = [...trackerClients, ...mappedBookedClients];
  
  // Deduplicate by registeredDateTimeAD - BOOKED CLIENTS always wins
  const clientMap = new Map();
  for (const client of merged) {
    const id = (client as Record<string, unknown>).registeredDateTimeAD as string;
    if (!id) continue;
    
    const existing = clientMap.get(id);
    // Keep if: no existing OR current is from booked (booked wins)
    if (!existing || (client as Record<string, unknown>)._source === 'booked') {
      clientMap.set(id, client);
    }
  }
  
  const deduplicated = Array.from(clientMap.values());
  
  console.log(`[UNIFIED FETCH] Tracker: ${trackerClients.length}, Booked: ${bookedClients.length}, Before dedup: ${merged.length}, After dedup: ${deduplicated.length}`);
  
  return deduplicated;
}

// ============= DELETE ROW FROM CLIENT TRACKER =============
// Used when moving a client from TRACKER to BOOKED CLIENTS
async function deleteTrackerRow(accessToken: string, spreadsheetId: string, rowNumber: number) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for deleting from tracker');
  }
  
  const sheetId = await getSheetId(accessToken, spreadsheetId, 'CLIENT TRACKER');
  
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
    console.error('Google Sheets API error (deleteTrackerRow):', response.status, errorText);
    throw new Error(`Failed to delete tracker row: ${response.status}`);
  }

  console.log(`[DELETE TRACKER ROW] Successfully deleted row ${rowNumber} from CLIENT TRACKER`);
  return { success: true };
}

// ============= DELETE ROW FROM BOOKED CLIENTS =============
// Used when moving a client from BOOKED CLIENTS back to TRACKER
async function deleteBookedRow(accessToken: string, spreadsheetId: string, rowNumber: number) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for deleting from booked clients');
  }
  
  const sheetId = await getSheetId(accessToken, spreadsheetId, 'BOOKED CLIENTS');
  
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
    console.error('Google Sheets API error (deleteBookedRow):', response.status, errorText);
    throw new Error(`Failed to delete booked row: ${response.status}`);
  }

  console.log(`[DELETE BOOKED ROW] Successfully deleted row ${rowNumber} from BOOKED CLIENTS`);
  return { success: true };
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

  // Intelligent sheet routing: search BOOKED CLIENTS first, then CLIENT TRACKER
  let targetSheet = 'CLIENT TRACKER';
  let actualRowNumber = rowNumber;

  if (registeredDateTimeAD) {
    const bookedRow = await verifyRowNumber(accessToken, spreadsheetId, 'BOOKED CLIENTS', -1, registeredDateTimeAD);
    if (bookedRow !== -1) {
      targetSheet = 'BOOKED CLIENTS';
      actualRowNumber = bookedRow;
      console.log(`logCallAttempt: Found client in BOOKED CLIENTS at row ${bookedRow}`);
    } else {
      actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);
      console.log(`logCallAttempt: Found client in CLIENT TRACKER at row ${actualRowNumber}`);
    }
  } else {
    console.log(`logCallAttempt: No registeredDateTimeAD provided, using raw rowNumber ${rowNumber} on CLIENT TRACKER`);
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

  const range = encodeURIComponent(`'${targetSheet}'!Y${actualRowNumber}`);
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

  // Log activity to correct sheet
  await appendActivityLog(accessToken, spreadsheetId, targetSheet as 'CLIENT TRACKER' | 'BOOKED CLIENTS', actualRowNumber, 'CALL', newLogEntry);

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
  // Use frontend-provided registeredDateTimeAD if available (for consistent ID matching)
  const registeredDateTimeAD = (clientData.registeredDateTimeAD as string) || now.toISOString();
  
  // Use BS dates sent from frontend (accurate conversion using nepali-date-converter)
  // Fallback to simplified conversion only if not provided
  const registeredBS = clientData.registeredDateBS || adToBSSimple(now);
  const inquiryBS = clientData.inquiryDateBS || adToBSSimple(now);
  
  // Create initial status log with selected status (default: "JUST ENQUIRED") and Nepal timezone timestamp
  const nepalOffset = 5.75 * 60 * 60 * 1000; // UTC+5:45 in milliseconds
  const nepalTime = new Date(now.getTime() + nepalOffset);
  const nepalTimeStr = nepalTime.toISOString().replace('T', ' ').substring(0, 19);
  const selectedStatus = (clientData.initialStatus as string) || 'JUST ENQUIRED';
  
  // Generate Nepal timezone timestamp in correct format (MM/DD/YYYY HH:MM:SS) for activity log
  // Frontend parser expects this format, NOT YYYY/MM/DD
  const activityLogTimestamp = `${String(nepalTime.getMonth() + 1).padStart(2, '0')}/${String(nepalTime.getDate()).padStart(2, '0')}/${nepalTime.getFullYear()} ${String(nepalTime.getHours()).padStart(2, '0')}:${String(nepalTime.getMinutes()).padStart(2, '0')}:${String(nepalTime.getSeconds()).padStart(2, '0')}`;
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
    `${activityLogTimestamp} | CLIENT_ADDED | New registration from ${clientData.source || 'Unknown'}`, // AJ: Initial activity log
  ]];

  const range = encodeURIComponent("'CLIENT TRACKER'!A2:AJ2");
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  // If initial status is BOOKED, MOVE to BOOKED CLIENTS sheet (copy then delete from tracker)
  if (selectedStatus.toUpperCase() === 'BOOKED') {
    console.log('[addClient] Status is BOOKED, moving to BOOKED CLIENTS sheet...');
    const isAlreadyBooked = await checkIfAlreadyBooked(accessToken, spreadsheetId, registeredDateTimeAD);
    if (!isAlreadyBooked) {
      await copyToBookedClients(accessToken, spreadsheetId, 2); // Row 2 is where we just inserted
      await deleteTrackerRow(accessToken, spreadsheetId, 2);    // MOVE not COPY: remove ghost row from CLIENT TRACKER
      console.log('[addClient] Client MOVED to BOOKED CLIENTS, removed from CLIENT TRACKER');
    } else {
      console.log('[addClient] Client already exists in BOOKED CLIENTS, skipping copy');
      await deleteTrackerRow(accessToken, spreadsheetId, 2);    // Still remove the tracker row to prevent duplicates
      console.log('[addClient] Removed duplicate tracker row for already-booked client');
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
  
  const response = await fetchWithRetry(updateUrl, {
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
      
      const bookedResponse = await fetchWithRetry(bookedUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      });
      
      if (bookedResponse.ok) {
        console.log(`[updateClient] Synced to BOOKED CLIENTS row ${bookedRowNumber}`);
        
        // Also sync event dates to BOOKED CLIENTS EVENT DETAILS sheet
        try {
          await syncToEventDetails(accessToken, spreadsheetId, registeredDateTimeAD);
          console.log(`[updateClient] Synced event dates to EVENT DETAILS`);
          
          // Also sync to BOOKED CLIENTS FREELANCERS sheet
          try {
            await syncSingleClientToFreelancers(accessToken, spreadsheetId, registeredDateTimeAD);
            console.log(`[updateClient] Synced to FREELANCERS sheet`);
          } catch (flSyncErr) {
            console.error(`[updateClient] Failed to sync to FREELANCERS:`, flSyncErr);
          }
        } catch (eventSyncErr) {
          console.error(`[updateClient] Failed to sync to EVENT DETAILS:`, eventSyncErr);
          // Non-fatal: don't block the main update
        }
      } else {
        console.error(`[updateClient] Failed to sync to BOOKED CLIENTS:`, await bookedResponse.text());
      }
    }
  }

  return { success: true, actualRowNumber };
}

// Search clients - searches BOTH sheets for unified results
async function searchClients(accessToken: string, spreadsheetId: string, query: string) {
  // Search both Tracker and Booked clients
  const allClients = await getAllClientsFromBothSheets(accessToken, spreadsheetId, 500);
  const lowerQuery = query.toLowerCase();
  
  return allClients.filter((client: Record<string, unknown>) => 
    (client.clientName as string)?.toLowerCase().includes(lowerQuery) ||
    (client.contactNo as string)?.includes(query) ||
    (client.whatsappNo as string)?.includes(query)
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

  // Intelligent sheet routing: search BOOKED CLIENTS first, then CLIENT TRACKER
  let targetSheet = 'CLIENT TRACKER';
  let actualRowNumber = rowNumber;

  if (registeredDateTimeAD) {
    const bookedRow = await verifyRowNumber(accessToken, spreadsheetId, 'BOOKED CLIENTS', -1, registeredDateTimeAD);
    if (bookedRow !== -1) {
      targetSheet = 'BOOKED CLIENTS';
      actualRowNumber = bookedRow;
      console.log(`updateClientHandler: Found client in BOOKED CLIENTS at row ${bookedRow}`);
    } else {
      actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);
      console.log(`updateClientHandler: Found client in CLIENT TRACKER at row ${actualRowNumber}`);
    }
  } else {
    console.log(`updateClientHandler: No registeredDateTimeAD provided, using raw rowNumber ${rowNumber} on CLIENT TRACKER`);
  }

  const range = encodeURIComponent(`'${targetSheet}'!X${actualRowNumber}`);
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

  // Log activity to correct sheet
  await appendActivityLog(accessToken, spreadsheetId, targetSheet as 'CLIENT TRACKER' | 'BOOKED CLIENTS', actualRowNumber, 'HANDLER_CHANGE', `Assigned to ${handler}`);

  return { success: true, actualRowNumber };
}

// Update client quotation in Column V
async function updateClientQuotation(accessToken: string, spreadsheetId: string, rowNumber: number, quotationData: string, registeredDateTimeAD?: string) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating quotation');
  }

  // Intelligent sheet routing: search BOOKED CLIENTS first, then CLIENT TRACKER
  let targetSheet = 'CLIENT TRACKER';
  let actualRowNumber = rowNumber;

  if (registeredDateTimeAD) {
    const bookedRow = await verifyRowNumber(accessToken, spreadsheetId, 'BOOKED CLIENTS', -1, registeredDateTimeAD);
    if (bookedRow !== -1) {
      targetSheet = 'BOOKED CLIENTS';
      actualRowNumber = bookedRow;
      console.log(`updateClientQuotation: Found client in BOOKED CLIENTS at row ${bookedRow}`);
    } else {
      actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);
      console.log(`updateClientQuotation: Found client in CLIENT TRACKER at row ${actualRowNumber}`);
    }
  } else {
    console.log(`updateClientQuotation: No registeredDateTimeAD provided, using raw rowNumber ${rowNumber} on CLIENT TRACKER`);
  }

  const range = encodeURIComponent(`'${targetSheet}'!V${actualRowNumber}`);
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

  // Log activity to correct sheet
  const amountMatch = quotationData.match(/NPR\s*([\d,]+)/i);
  const amountSummary = amountMatch ? `NPR ${amountMatch[1]}` : 'Quotation updated';
  await appendActivityLog(accessToken, spreadsheetId, targetSheet as 'CLIENT TRACKER' | 'BOOKED CLIENTS', actualRowNumber, 'QUOTATION', amountSummary);

  return { success: true, actualRowNumber };
}

// Update client mindset in Column Z with timestamp
async function updateClientMindset(accessToken: string, spreadsheetId: string, rowNumber: number, mindset: string, clientTimestamp: string, registeredDateTimeAD?: string) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating mindset');
  }

  // Intelligent sheet routing: search BOOKED CLIENTS first, then CLIENT TRACKER
  let targetSheet = 'CLIENT TRACKER';
  let actualRowNumber = rowNumber;

  if (registeredDateTimeAD) {
    const bookedRow = await verifyRowNumber(accessToken, spreadsheetId, 'BOOKED CLIENTS', -1, registeredDateTimeAD);
    if (bookedRow !== -1) {
      targetSheet = 'BOOKED CLIENTS';
      actualRowNumber = bookedRow;
      console.log(`updateClientMindset: Found client in BOOKED CLIENTS at row ${bookedRow}`);
    } else {
      actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);
      console.log(`updateClientMindset: Found client in CLIENT TRACKER at row ${actualRowNumber}`);
    }
  } else {
    console.log(`updateClientMindset: No registeredDateTimeAD provided, using raw rowNumber ${rowNumber} on CLIENT TRACKER`);
  }

  // Store as "MINDSET - MM/DD/YYYY, HH:MM:SS"
  const mindsetWithTimestamp = `${mindset} - ${clientTimestamp}`;

  const range = encodeURIComponent(`'${targetSheet}'!Z${actualRowNumber}`);
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

  // Log activity to correct sheet
  await appendActivityLog(accessToken, spreadsheetId, targetSheet as 'CLIENT TRACKER' | 'BOOKED CLIENTS', actualRowNumber, 'MINDSET', mindset);

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

  // Intelligent sheet routing: search BOOKED CLIENTS first, then CLIENT TRACKER
  let targetSheet = 'CLIENT TRACKER';
  let actualRowNumber = rowNumber;

  if (registeredDateTimeAD) {
    // Search BOOKED CLIENTS first (clients only exist in one sheet at a time)
    const bookedRow = await verifyRowNumber(accessToken, spreadsheetId, 'BOOKED CLIENTS', -1, registeredDateTimeAD);
    if (bookedRow !== -1) {
      targetSheet = 'BOOKED CLIENTS';
      actualRowNumber = bookedRow;
      console.log(`addClientComment: Found client in BOOKED CLIENTS at row ${bookedRow}`);
    } else {
      // Not in Booked, search CLIENT TRACKER
      actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);
      console.log(`addClientComment: Found client in CLIENT TRACKER at row ${actualRowNumber}`);
    }
  } else {
    console.log(`addClientComment: No registeredDateTimeAD provided, using raw rowNumber ${rowNumber} on CLIENT TRACKER`);
  }

  // Format: "[MM/DD/YYYY HH:MM] Comment text" - using ||| delimiter for multi-line support
  const newCommentEntry = `[${clientTimestamp}] ${comment}`;
  const updatedComments = existingComments 
    ? `${existingComments}|||${newCommentEntry}` 
    : newCommentEntry;

  const range = encodeURIComponent(`'${targetSheet}'!AC${actualRowNumber}`);
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

  // Log activity to the correct sheet
  const truncatedComment = comment.length > 50 ? comment.substring(0, 50) + '...' : comment;
  await appendActivityLog(accessToken, spreadsheetId, targetSheet, actualRowNumber, 'COMMENT', truncatedComment);

  return { success: true, comments: updatedComments, actualRowNumber };
}

// Add comment to BOOKED CLIENTS Column AC and sync to CLIENT TRACKER
async function addBookedClientComment(
  accessToken: string,
  spreadsheetId: string,
  bookedRowNumber: number,
  comment: string,
  existingComments: string,
  clientTimestamp: string,
  registeredDateTimeAD?: string
) {
  if (!bookedRowNumber || bookedRowNumber < 2) {
    throw new Error('Valid bookedRowNumber is required for adding comment');
  }

  // Format: "[MM/DD/YYYY HH:MM] Comment text" - using ||| delimiter for multi-line support
  const newCommentEntry = `[${clientTimestamp}] ${comment}`;
  const updatedComments = existingComments 
    ? `${existingComments}|||${newCommentEntry}` 
    : newCommentEntry;

  // 1. Update BOOKED CLIENTS sheet first
  const bookedRange = encodeURIComponent(`'BOOKED CLIENTS'!AC${bookedRowNumber}`);
  const bookedUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}?valueInputOption=USER_ENTERED`;
  
  const bookedResponse = await fetch(bookedUpdateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[updatedComments]] }),
  });

  if (!bookedResponse.ok) {
    const errorText = await bookedResponse.text();
    console.error('Google Sheets API error (addBookedClientComment - BOOKED):', bookedResponse.status, errorText);
    throw new Error(`Failed to add comment to BOOKED CLIENTS: ${bookedResponse.status}`);
  }

  // 2. Sync to CLIENT TRACKER if registeredDateTimeAD provided
  if (registeredDateTimeAD) {
    try {
      // Find the tracker row using the unique registeredDateTimeAD
      const trackerRange = encodeURIComponent("'CLIENT TRACKER'!A2:A2000");
      const trackerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerRange}`;
      
      const trackerResponse = await fetch(trackerUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (trackerResponse.ok) {
        const trackerData = await trackerResponse.json();
        const rows = trackerData.values || [];
        const normalizedSearch = registeredDateTimeAD.trim();
        
        for (let i = 0; i < rows.length; i++) {
          const cellValue = (rows[i][0] || '').trim();
          if (cellValue === normalizedSearch) {
            const trackerRowNumber = i + 2;
            
            // Update CLIENT TRACKER Column AC
            const trackerUpdateRange = encodeURIComponent(`'CLIENT TRACKER'!AC${trackerRowNumber}`);
            const trackerUpdateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerUpdateRange}?valueInputOption=USER_ENTERED`;
            
            await fetch(trackerUpdateUrl, {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ values: [[updatedComments]] }),
            });
            
            console.info(`[BOOKED COMMENT] Synced comment to CLIENT TRACKER row ${trackerRowNumber}`);
            break;
          }
        }
      }
    } catch (err) {
      console.warn('[BOOKED COMMENT] Failed to sync to CLIENT TRACKER:', err);
      // Don't throw - BOOKED CLIENTS update succeeded
    }
  }

  // Log activity to Column AJ in BOOKED CLIENTS
  const truncatedComment = comment.length > 50 ? comment.substring(0, 50) + '...' : comment;
  await appendActivityLog(accessToken, spreadsheetId, 'BOOKED CLIENTS', bookedRowNumber, 'COMMENT', truncatedComment);

  return { success: true, comments: updatedComments };
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

  // Intelligent sheet routing: search BOOKED CLIENTS first, then CLIENT TRACKER
  let targetSheet = 'CLIENT TRACKER';
  let actualRowNumber = rowNumber;

  if (registeredDateTimeAD) {
    const bookedRow = await verifyRowNumber(accessToken, spreadsheetId, 'BOOKED CLIENTS', -1, registeredDateTimeAD);
    if (bookedRow !== -1) {
      targetSheet = 'BOOKED CLIENTS';
      actualRowNumber = bookedRow;
      console.log(`updateBargainingRates: Found client in BOOKED CLIENTS at row ${bookedRow}`);
    } else {
      actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);
      console.log(`updateBargainingRates: Found client in CLIENT TRACKER at row ${actualRowNumber}`);
    }
  } else {
    console.log(`updateBargainingRates: No registeredDateTimeAD provided, using raw rowNumber ${rowNumber} on CLIENT TRACKER`);
  }

  // Update both columns in one batch
  const range = encodeURIComponent(`'${targetSheet}'!AA${actualRowNumber}:AB${actualRowNumber}`);
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

  // Intelligent sheet routing: search BOOKED CLIENTS first, then CLIENT TRACKER
  let targetSheet = 'CLIENT TRACKER';
  let actualRowNumber = rowNumber;

  if (registeredDateTimeAD) {
    const bookedRow = await verifyRowNumber(accessToken, spreadsheetId, 'BOOKED CLIENTS', -1, registeredDateTimeAD);
    if (bookedRow !== -1) {
      targetSheet = 'BOOKED CLIENTS';
      actualRowNumber = bookedRow;
      console.log(`updateClientBargainedRates: Found client in BOOKED CLIENTS at row ${bookedRow}`);
    } else {
      actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);
      console.log(`updateClientBargainedRates: Found client in CLIENT TRACKER at row ${actualRowNumber}`);
    }
  } else {
    console.log(`updateClientBargainedRates: No registeredDateTimeAD provided, using raw rowNumber ${rowNumber} on CLIENT TRACKER`);
  }

  // Update only Column AB
  const range = encodeURIComponent(`'${targetSheet}'!AB${actualRowNumber}`);
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

  // Intelligent sheet routing: search BOOKED CLIENTS first, then CLIENT TRACKER
  let targetSheet = 'CLIENT TRACKER';
  let actualRowNumber = rowNumber;

  if (registeredDateTimeAD) {
    const bookedRow = await verifyRowNumber(accessToken, spreadsheetId, 'BOOKED CLIENTS', -1, registeredDateTimeAD);
    if (bookedRow !== -1) {
      targetSheet = 'BOOKED CLIENTS';
      actualRowNumber = bookedRow;
      console.log(`updateOurCounterRates: Found client in BOOKED CLIENTS at row ${bookedRow}`);
    } else {
      actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);
      console.log(`updateOurCounterRates: Found client in CLIENT TRACKER at row ${actualRowNumber}`);
    }
  } else {
    console.log(`updateOurCounterRates: No registeredDateTimeAD provided, using raw rowNumber ${rowNumber} on CLIENT TRACKER`);
  }

  // Update only Column AA
  const range = encodeURIComponent(`'${targetSheet}'!AA${actualRowNumber}`);
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

// Update final quotation in Column AD
// Smart sheet routing: searches BOOKED CLIENTS first (priority), then CLIENT TRACKER
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

  let targetSheet = 'CLIENT TRACKER';
  let actualRowNumber = rowNumber;

  if (registeredDateTimeAD) {
    // PRIORITY: Try to find in BOOKED CLIENTS first (booked wins)
    const bookedRange = encodeURIComponent(`'BOOKED CLIENTS'!A2:A2000`);
    const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`;
    
    const bookedResponse = await fetch(bookedUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    let foundInBooked = false;
    if (bookedResponse.ok) {
      const bookedData = await bookedResponse.json();
      if (bookedData.values) {
        const normalizedDateTime = registeredDateTimeAD.trim();
        for (let i = 0; i < bookedData.values.length; i++) {
          const cellValue = (bookedData.values[i][0] || '').trim();
          if (cellValue === normalizedDateTime) {
            targetSheet = 'BOOKED CLIENTS';
            actualRowNumber = i + 2;
            foundInBooked = true;
            console.log(`[updateFinalQuotation] Found in BOOKED CLIENTS at row ${actualRowNumber}`);
            break;
          }
        }
      }
    }
    
    // If not in BOOKED CLIENTS, try CLIENT TRACKER
    if (!foundInBooked) {
      const trackerRange = encodeURIComponent(`'CLIENT TRACKER'!A2:A2000`);
      const trackerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerRange}`;
      
      const trackerResponse = await fetch(trackerUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (trackerResponse.ok) {
        const trackerData = await trackerResponse.json();
        if (trackerData.values) {
          const normalizedDateTime = registeredDateTimeAD.trim();
          for (let i = 0; i < trackerData.values.length; i++) {
            const cellValue = (trackerData.values[i][0] || '').trim();
            if (cellValue === normalizedDateTime) {
              targetSheet = 'CLIENT TRACKER';
              actualRowNumber = i + 2;
              console.log(`[updateFinalQuotation] Found in CLIENT TRACKER at row ${actualRowNumber}`);
              break;
            }
          }
        }
      }
    }
  } else {
    // Fallback: verify row in Tracker if no ID provided (legacy behavior)
    actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, undefined);
  }

  // Write to Column AD in the correct sheet
  const range = encodeURIComponent(`'${targetSheet}'!AD${actualRowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  console.log(`[updateFinalQuotation] Writing to ${targetSheet}!AD${actualRowNumber}: ${finalQuotation}`);
  
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

  // Log activity to Column AJ - extract amount for summary
  const amountMatch = finalQuotation.match(/NPR\s*([\d,]+)/i);
  const amountSummary = amountMatch ? `Final quotation locked: NPR ${amountMatch[1]}` : 'Final quotation set';
  await appendActivityLog(accessToken, spreadsheetId, targetSheet as 'CLIENT TRACKER' | 'BOOKED CLIENTS', actualRowNumber, 'FINAL_QUOTATION', amountSummary);

  return { success: true, finalQuotation, actualRowNumber, targetSheet };
}

// ============= UPDATE CLIENT PRIORITY =============
// Update priority rating (Column AK) - Star rating 1-5
// Uses intelligent sheet routing to find client in either CLIENT TRACKER or BOOKED CLIENTS
async function updateClientPriority(
  accessToken: string,
  spreadsheetId: string,
  rowNumber: number,
  priority: string,
  registeredDateTimeAD?: string
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating priority');
  }

  // Determine which sheet the client is in and find the correct row
  let targetSheet: 'CLIENT TRACKER' | 'BOOKED CLIENTS' = 'CLIENT TRACKER';
  let actualRowNumber = rowNumber;

  if (registeredDateTimeAD) {
    // Search BOOKED CLIENTS first (it's the source of truth for booked clients)
    const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:A2000");
    const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`;

    const bookedResponse = await fetch(bookedUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (bookedResponse.ok) {
      const bookedData = await bookedResponse.json();
      if (bookedData.values) {
        const foundIndex = bookedData.values.findIndex((row: string[]) => row[0]?.trim() === registeredDateTimeAD.trim());
        if (foundIndex !== -1) {
          targetSheet = 'BOOKED CLIENTS';
          actualRowNumber = foundIndex + 2;
          console.log(`[PRIORITY] Found in BOOKED CLIENTS at row ${actualRowNumber}`);
        }
      }
    }

    // If not found in BOOKED CLIENTS, search CLIENT TRACKER
    if (targetSheet === 'CLIENT TRACKER') {
      const trackerRange = encodeURIComponent("'CLIENT TRACKER'!A2:A2000");
      const trackerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerRange}`;

      const trackerResponse = await fetch(trackerUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (trackerResponse.ok) {
        const trackerData = await trackerResponse.json();
        if (trackerData.values) {
          const foundIndex = trackerData.values.findIndex((row: string[]) => row[0]?.trim() === registeredDateTimeAD.trim());
          if (foundIndex !== -1) {
            actualRowNumber = foundIndex + 2;
            console.log(`[PRIORITY] Found in CLIENT TRACKER at row ${actualRowNumber}`);
          }
        }
      }
    }
  }

  // Update Column AK (priority) - Column index 36
  const range = encodeURIComponent(`'${targetSheet}'!AK${actualRowNumber}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[priority]] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (updateClientPriority):', response.status, errorText);
    throw new Error(`Failed to update priority: ${response.status}`);
  }

  console.log(`[PRIORITY] Updated ${targetSheet} row ${actualRowNumber} to ${priority} stars`);
  return { success: true };
}

// ============= UPDATE BENZO KEEP NOTES =============
// Update Benzo Keep notes (Column AL - index 37) - JSON formatted notes
// Uses intelligent sheet routing to find client in either CLIENT TRACKER or BOOKED CLIENTS
async function updateBenzoKeepNotes(
  accessToken: string,
  spreadsheetId: string,
  rowNumber: number,
  notesData: string,
  registeredDateTimeAD?: string
): Promise<{ success: boolean; benzoKeepNotes: string }> {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating Benzo Keep notes');
  }

  // Determine which sheet the client is in and find the correct row
  let targetSheet: 'CLIENT TRACKER' | 'BOOKED CLIENTS' = 'CLIENT TRACKER';
  let actualRowNumber = rowNumber;

  if (registeredDateTimeAD) {
    // Search BOOKED CLIENTS first (it's the source of truth for booked clients)
    const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:A2000");
    const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`;

    const bookedResponse = await fetch(bookedUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (bookedResponse.ok) {
      const bookedData = await bookedResponse.json();
      if (bookedData.values) {
        const foundIndex = bookedData.values.findIndex((row: string[]) => row[0]?.trim() === registeredDateTimeAD.trim());
        if (foundIndex !== -1) {
          targetSheet = 'BOOKED CLIENTS';
          actualRowNumber = foundIndex + 2;
          console.log(`[BENZO KEEP] Found in BOOKED CLIENTS at row ${actualRowNumber}`);
        }
      }
    }

    // If not found in BOOKED CLIENTS, search CLIENT TRACKER
    if (targetSheet === 'CLIENT TRACKER') {
      const trackerRange = encodeURIComponent("'CLIENT TRACKER'!A2:A2000");
      const trackerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerRange}`;

      const trackerResponse = await fetch(trackerUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (trackerResponse.ok) {
        const trackerData = await trackerResponse.json();
        if (trackerData.values) {
          const foundIndex = trackerData.values.findIndex((row: string[]) => row[0]?.trim() === registeredDateTimeAD.trim());
          if (foundIndex !== -1) {
            actualRowNumber = foundIndex + 2;
            console.log(`[BENZO KEEP] Found in CLIENT TRACKER at row ${actualRowNumber}`);
          }
        }
      }
    }
  }

  // Update Column AL (Benzo Keep notes) - Column index 37
  const range = encodeURIComponent(`'${targetSheet}'!AL${actualRowNumber}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[notesData]] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (updateBenzoKeepNotes):', response.status, errorText);
    throw new Error(`Failed to update Benzo Keep notes: ${response.status}`);
  }

  console.log(`[BENZO KEEP] Updated ${targetSheet} row ${actualRowNumber} notes saved`);
  return { success: true, benzoKeepNotes: notesData };
}

// Add payment entry to Columns AE, AF, AG
// SINGLE SOURCE OF TRUTH: Payments are ONLY written to BOOKED CLIENTS sheet
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
  _sourceSheet?: 'tracker' | 'booked', // DEPRECATED - kept for API compatibility, always writes to BOOKED CLIENTS
  clientName?: string // For income statement in WTN INCOME & EXPENSES
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for adding payment');
  }
  
  // SINGLE SOURCE OF TRUTH: Always write to BOOKED CLIENTS only
  const targetSheet = 'BOOKED CLIENTS';
  
  // Find the correct row in BOOKED CLIENTS using registeredDateTimeAD lookup
  let actualRowNumber = rowNumber;
  
  if (registeredDateTimeAD) {
    try {
      const verifyRange = encodeURIComponent(`'${targetSheet}'!A2:A2000`);
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
                console.log(`[PAYMENT] Row correction: ${rowNumber} -> ${foundRow} for ${registeredDateTimeAD}`);
              }
              actualRowNumber = foundRow;
              break;
            }
          }
        }
      }
    } catch (lookupError) {
      console.error('Error looking up row, falling back to provided rowNumber:', lookupError);
    }
  }
  
  // BACKEND VALIDATION: Read Column AD (Final Quotation) from BOOKED CLIENTS to validate
  // This is the single source of truth - do NOT trust client-sent finalQuotationAmount
  const finalQuoteRange = encodeURIComponent(`'${targetSheet}'!AD${actualRowNumber}`);
  const finalQuoteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${finalQuoteRange}`;
  
  const finalQuoteResponse = await fetch(finalQuoteUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!finalQuoteResponse.ok) {
    throw new Error('Failed to verify final quotation for this client');
  }
  
  const finalQuoteData = await finalQuoteResponse.json();
  const finalQuotationCell = finalQuoteData.values?.[0]?.[0] || '';
  
  // Parse the final quotation amount from the cell (format: "PREMIUM: NPR 75,000/-" or similar)
  const finalQuoteMatch = finalQuotationCell.match(/NPR\s*([\d,]+)/i);
  const serverFinalQuotationAmount = finalQuoteMatch 
    ? parseInt(finalQuoteMatch[1].replace(/,/g, ''), 10) 
    : 0;
  
  if (serverFinalQuotationAmount <= 0) {
    throw new Error('Final quotation not fixed for this client. Please lock final quotation (ADVANCE PENDING status) before recording payment.');
  }
  
  console.log(`[PAYMENT] Verified final quotation: NPR ${serverFinalQuotationAmount.toLocaleString('en-IN')}`);
  
  // Use the server-verified amount for all calculations (not client-sent value)
  const verifiedFinalQuotationAmount = serverFinalQuotationAmount;

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
  
  // Use server-verified final quotation amount for remaining calculation
  const remaining = verifiedFinalQuotationAmount - totalPaid;
  const remainingFormatted = `NPR ${remaining.toLocaleString('en-IN')}/-`;
  
  const paymentValues = [[updatedPaymentsMade, updatedPaymentDatesAD, remainingFormatted]];
  
  // Update BOOKED CLIENTS sheet (single source of truth for payments)
  const paymentRange = encodeURIComponent(`'${targetSheet}'!AE${actualRowNumber}:AG${actualRowNumber}`);
  const paymentUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${paymentRange}?valueInputOption=USER_ENTERED`;
  
  const paymentResponse = await fetch(paymentUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: paymentValues }),
  });

  if (!paymentResponse.ok) {
    const errorText = await paymentResponse.text();
    console.error(`Google Sheets API error (addPayment to ${targetSheet}):`, paymentResponse.status, errorText);
    throw new Error(`Failed to add payment: ${paymentResponse.status}`);
  }
  
  console.log(`[PAYMENT] Payment recorded in ${targetSheet} row ${actualRowNumber} (SINGLE SOURCE OF TRUTH)`);

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

  // Log activity to Column AJ in BOOKED CLIENTS
  const paymentDetails = `NPR ${parseInt(paymentAmount).toLocaleString('en-IN')}/- ${paymentType} via ${bank}`;
  await appendActivityLog(accessToken, spreadsheetId, 'BOOKED CLIENTS', actualRowNumber, 'PAYMENT', paymentDetails);

  return { 
    success: true, 
    paymentsMade: updatedPaymentsMade, 
    paymentDatesAD: updatedPaymentDatesAD,
    remainingPayment: remainingFormatted,
    totalPaid
  };
}

// Update an existing payment entry at a specific index
// SINGLE SOURCE OF TRUTH: Only updates BOOKED CLIENTS sheet (no sync to CLIENT TRACKER)
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
  
  // SINGLE SOURCE OF TRUTH: Only update BOOKED CLIENTS sheet
  // First verify the row number
  const actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'BOOKED CLIENTS', rowNumber, registeredDateTimeAD);
  
  // BACKEND VALIDATION: Read Column AD (Final Quotation) from BOOKED CLIENTS to validate
  // This is the single source of truth - do NOT trust client-sent finalQuotationAmount
  const finalQuoteRange = encodeURIComponent(`'BOOKED CLIENTS'!AD${actualRowNumber}`);
  const finalQuoteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${finalQuoteRange}`;
  
  const finalQuoteResponse = await fetch(finalQuoteUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!finalQuoteResponse.ok) {
    throw new Error('Failed to verify final quotation for this client');
  }
  
  const finalQuoteData = await finalQuoteResponse.json();
  const finalQuotationCell = finalQuoteData.values?.[0]?.[0] || '';
  
  // Parse the final quotation amount from the cell
  const finalQuoteMatch = finalQuotationCell.match(/NPR\s*([\d,]+)/i);
  const serverFinalQuotationAmount = finalQuoteMatch 
    ? parseInt(finalQuoteMatch[1].replace(/,/g, ''), 10) 
    : 0;
  
  if (serverFinalQuotationAmount <= 0) {
    throw new Error('Final quotation not fixed for this client. Please lock final quotation (ADVANCE PENDING status) before editing payment.');
  }
  
  console.log(`[PAYMENT UPDATE] Verified final quotation: NPR ${serverFinalQuotationAmount.toLocaleString('en-IN')}`);

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
  
  // Calculate remaining using server-verified final quotation amount
  const remaining = Math.max(0, serverFinalQuotationAmount - totalPaid);
  const remainingFormatted = `NPR ${remaining.toLocaleString('en-IN')}/-`;

  // Create payment values array [paymentsMade, '', remainingPayment] 
  // Note: We're not updating paymentDatesAD (column AF) for simplicity
  const paymentValues = [[updatedPaymentsMade, '', remainingFormatted]];

  // actualRowNumber was already verified above when checking final quotation
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
  
  console.log(`[UPDATE PAYMENT] Updated BOOKED CLIENTS row ${actualRowNumber} (SINGLE SOURCE OF TRUTH)`);

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
  
  // Get the first line for the current status (newest entry is first)
  const lastLine = lines[0].trim().toUpperCase();
  
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
  const clientRange = encodeURIComponent(`'CLIENT TRACKER'!A${originalRowNumber}:AL${originalRowNumber}`);
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
    clientRow[33] || '',  // AH: Company Name
    clientRow[34] || '',  // AI: Service Types
    clientRow[35] || '',  // AJ: Last Activity Log
    clientRow[36] || '',  // AK: Priority
    clientRow[37] || '',  // AL: Benzo Keep Notes
  ]];

  // Write the data to row 2 of BOOKED CLIENTS (same structure as CLIENT TRACKER: A-AL)
  const writeRange = encodeURIComponent("'BOOKED CLIENTS'!A2:AL2");
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
  
  // Map columns from BOOKED CLIENTS to EVENT DETAILS:
  // A-C (same): registeredDateTimeAD, registeredDateBS, clientName
  // L-P -> D-H: events, eventYear, eventMonth, eventDay, eventDateAD
  const eventDetailsValues = [
    clientRow[0] || '',   // A: registeredDateTimeAD (same)
    clientRow[1] || '',   // B: registeredDateBS (same)
    clientRow[2] || '',   // C: clientName (same)
    clientRow[11] || '',  // D: events (from L)
    clientRow[12] || '',  // E: eventYear (from M)
    clientRow[13] || '',  // F: eventMonth (from N)
    clientRow[14] || '',  // G: eventDay (from O)
    clientRow[15] || '',  // H: eventDateAD (from P)
    '',                   // I: empty/reserved separator
  ];
  
  // Use append API (safe - no row shifting) instead of insertDimension
  const appendRange = encodeURIComponent("'BOOKED CLIENTS EVENT DETAILS'!A:I");
  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  
  const writeResponse = await fetchWithRetry(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [eventDetailsValues] }),
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
  const newRows: string[][] = [];

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
      
      const updateResponse = await fetchWithRetry(updateUrl, {
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
      // Collect new row for batch append (NO insert-at-2, NO row shifting)
      newRows.push([
        row[0] || '',   // A: registeredDateTimeAD
        row[1] || '',   // B: registeredDateBS
        row[2] || '',   // C: clientName
        row[11] || '',  // D: events (from L)
        row[12] || '',  // E: eventYear (from M)
        row[13] || '',  // F: eventMonth (from N)
        row[14] || '',  // G: eventDay (from O)
        row[15] || '',  // H: eventDateAD (from P)
        '',             // I: empty/reserved separator
      ]);
      copiedCount++;
    }
  }

  // 3b. Batch append all new rows at the end (no row shifting!)
  if (newRows.length > 0) {
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'BOOKED CLIENTS EVENT DETAILS'!A:I")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    await fetchWithRetry(appendUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: newRows }),
    });
    console.log(`[fullSyncEventDetails] Appended ${newRows.length} new rows`);
  }

  // 4. Deduplication pass: remove any duplicate registeredDateTimeAD entries
  let dedupCount = 0;
  const dedupRange = encodeURIComponent("'BOOKED CLIENTS EVENT DETAILS'!A2:A2000");
  const dedupResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${dedupRange}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (dedupResponse.ok) {
    const dedupData = await dedupResponse.json();
    const dedupRows: string[][] = dedupData.values || [];
    const seenIds = new Set<string>();
    const dupeRowNumbers: number[] = [];

    dedupRows.forEach((r: string[], idx: number) => {
      const key = (r[0] || '').trim();
      if (!key) return;
      if (seenIds.has(key)) {
        dupeRowNumbers.push(idx + 2); // mark later occurrence for deletion
      } else {
        seenIds.add(key);
      }
    });

    if (dupeRowNumbers.length > 0) {
      const sheetIdForDedup = await getSheetId(accessToken, spreadsheetId, 'BOOKED CLIENTS EVENT DETAILS');
      const sortedDupes = dupeRowNumbers.sort((a, b) => b - a);
      const dedupRequests = sortedDupes.map(rowNum => ({
        deleteDimension: {
          range: { sheetId: sheetIdForDedup, dimension: 'ROWS', startIndex: rowNum - 1, endIndex: rowNum }
        }
      }));
      await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: dedupRequests }),
      });
      dedupCount = dupeRowNumbers.length;
      console.log(`[fullSyncEventDetails] Removed ${dedupCount} duplicate rows`);
    }
  }

  // 5. Cleanup: remove rows from EVENT DETAILS that are NOT in BOOKED CLIENTS
  let removedCount = 0;
  const validBookedIds = new Set(
    bookedData.values.map((row: string[]) => (row[0] || '').trim()).filter(Boolean)
  );

  // Re-read EVENT DETAILS column A to get current state (after dedup)
  const cleanupRange = encodeURIComponent("'BOOKED CLIENTS EVENT DETAILS'!A2:A2000");
  const cleanupResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${cleanupRange}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (cleanupResponse.ok) {
    const cleanupData = await cleanupResponse.json();
    const edRows: string[][] = cleanupData.values || [];
    const rowsToDelete: number[] = [];

    edRows.forEach((r: string[], idx: number) => {
      const key = (r[0] || '').trim();
      if (key && !validBookedIds.has(key)) {
        rowsToDelete.push(idx + 2);
      }
    });

    if (rowsToDelete.length > 0) {
      const sheetId = await getSheetId(accessToken, spreadsheetId, 'BOOKED CLIENTS EVENT DETAILS');
      const sortedRows = rowsToDelete.sort((a, b) => b - a);
      const requests = sortedRows.map(rowNum => ({
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowNum - 1, endIndex: rowNum }
        }
      }));
      await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests }),
      });
      removedCount = rowsToDelete.length;
      console.log(`[fullSyncEventDetails] Removed ${removedCount} stale rows (not in BOOKED CLIENTS)`);
    }
  }

  return { 
    success: true, 
    copiedCount, 
    updatedCount, 
    removedCount,
    dedupCount,
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

  // Return empty data if sheet doesn't exist or is inaccessible
  // This allows non-booked clients to be handled gracefully
  if (!response.ok) {
    console.warn(`[EVENT DETAILS] Sheet fetch failed for ${registeredDateTimeAD}: ${response.status}`);
    return { rowNumber: 0, events: [] };
  }

  const data = await response.json();
  if (!data.values) {
    // No data in sheet - return empty
    return { rowNumber: 0, events: [] };
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
    // Return null data instead of throwing - allows frontend fallback to basic event data
    return { rowNumber: 0, events: [] };
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

// ============= BULK EVENT DETAILS =============
// Get event details for multiple clients in a single API call
// Returns a map keyed by registeredDateTimeAD with simplified event details
async function getBulkEventDetails(
  accessToken: string,
  spreadsheetId: string,
  clientIds: string[]
): Promise<Record<string, Array<{
  eventIndex: number;
  eventName: string;
  eventDateAD: string;
  venueName: string;
  venueCity: string;
  venueArea: string;
  venueMap: string;
  eventStartTime: string;
  eventEndTime: string;
  parlourName: string;
  parlourCity: string;
  parlourArea: string;
  parlourMap: string;
  parlourStartTime: string;
  parlourEndTime: string;
  guestCount: string;
  eventDemand: string;
  eventReferences: string;
}>>> {
  if (!clientIds || clientIds.length === 0) {
    return {};
  }

  // Fetch all event details at once (limit to reasonable amount)
  // Range includes up to AH for eventDemand (AG) and eventReferences (AH)
  const range = encodeURIComponent("'BOOKED CLIENTS EVENT DETAILS'!A2:AH500");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    console.warn('[BULK EVENT DETAILS] Sheet fetch failed:', response.status);
    return {};
  }

  const data = await response.json();
  if (!data.values) {
    return {};
  }

  // Normalize client IDs for comparison
  const normalizedIds = new Set(clientIds.map(id => id.trim()));
  const result: Record<string, Array<{
    eventIndex: number;
    eventName: string;
    eventDateAD: string;
    venueName: string;
    venueCity: string;
    venueArea: string;
    venueMap: string;
    eventStartTime: string;
    eventEndTime: string;
    parlourName: string;
    parlourCity: string;
    parlourArea: string;
    parlourMap: string;
    parlourStartTime: string;
    parlourEndTime: string;
    guestCount: string;
    eventDemand: string;
    eventReferences: string;
  }>> = {};

  // Process each row looking for matching client IDs
  for (const row of data.values) {
    const registeredDateTimeAD = (row[0] || '').trim();
    
    if (!normalizedIds.has(registeredDateTimeAD)) {
      continue;
    }

    // Parse multi-line columns
    const eventNames = (row[3] || '').split('\n');
    const eventDatesAD = (row[7] || '').split('\n');
    const venueNames = (row[10] || '').split('\n');
    const venueCities = (row[11] || '').split('\n');
    const venueAreas = (row[12] || '').split('\n');
    const venueMaps = (row[13] || '').split('\n');
    const eventStartTimes = (row[14] || '').split('\n');
    const eventEndTimes = (row[15] || '').split('\n');
    const parlourNames = (row[17] || '').split('\n');
    const parlourCities = (row[18] || '').split('\n');
    const parlourAreas = (row[19] || '').split('\n');
    const parlourMaps = (row[20] || '').split('\n');
    const parlourStartTimes = (row[21] || '').split('\n');
    const parlourEndTimes = (row[22] || '').split('\n');
    const guestCounts = (row[31] || '').split('\n');
    const eventDemands = (row[32] || '').split('\n');
    const eventReferences = (row[33] || '').split('\n');

    const events = [];
    for (let i = 0; i < eventNames.length; i++) {
      const name = eventNames[i]?.trim();
      if (!name) continue;

      events.push({
        eventIndex: i,
        eventName: name,
        eventDateAD: eventDatesAD[i]?.trim() || '',
        venueName: venueNames[i]?.trim() || '',
        venueCity: venueCities[i]?.trim() || '',
        venueArea: venueAreas[i]?.trim() || '',
        venueMap: venueMaps[i]?.trim() || '',
        eventStartTime: eventStartTimes[i]?.trim() || '',
        eventEndTime: eventEndTimes[i]?.trim() || '',
        parlourName: parlourNames[i]?.trim() || '',
        parlourCity: parlourCities[i]?.trim() || '',
        parlourArea: parlourAreas[i]?.trim() || '',
        parlourMap: parlourMaps[i]?.trim() || '',
        parlourStartTime: parlourStartTimes[i]?.trim() || '',
        parlourEndTime: parlourEndTimes[i]?.trim() || '',
        guestCount: guestCounts[i]?.trim() || '',
        eventDemand: eventDemands[i]?.trim() || '',
        eventReferences: eventReferences[i]?.trim() || '',
      });
    }

    result[registeredDateTimeAD] = events;
  }

  return result;
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

  // ===== EVENT NAME VERIFICATION: ensure eventIndex targets the correct event =====
  let verifiedEventIndex = eventIndex;
  if (updates._eventName) {
    const eventNames = (existingRow[3] || '').split('\n');
    const expectedName = updates._eventName.trim().toUpperCase();
    const currentName = (eventNames[eventIndex] || '').trim().toUpperCase();
    
    if (currentName !== expectedName) {
      console.warn(`[EVENT INDEX MISMATCH] Expected "${expectedName}" at index ${eventIndex}, found "${currentName}". Searching...`);
      const correctIndex = eventNames.findIndex(n => n.trim().toUpperCase() === expectedName);
      if (correctIndex >= 0) {
        verifiedEventIndex = correctIndex;
        console.log(`[EVENT INDEX MISMATCH] Found correct index: ${correctIndex}`);
      } else {
        console.error(`[EVENT INDEX MISMATCH] Event "${expectedName}" not found in any line`);
      }
    }
    delete updates._eventName;
  }

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
      // This field is being updated — use verifiedEventIndex
      updateValues.push(updateLineAtIndex(existingValue, verifiedEventIndex, updates[fieldName]));
    } else {
      // Keep existing value
      updateValues.push(existingValue);
    }
  }

  // ===== RACE CONDITION FIX: Re-verify row before writing =====
  // Between our initial read and now, another operation may have shifted rows.
  // Re-read Column A at the found rowNumber to verify it still matches.
  const verifyRange = encodeURIComponent(`'BOOKED CLIENTS EVENT DETAILS'!A${rowNumber}`);
  const verifyUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${verifyRange}`;
  const verifyResp = await fetchWithRetry(verifyUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  let verifiedRowNumber = rowNumber;
  
  if (verifyResp.ok) {
    const verifyData = await verifyResp.json();
    const currentCellValue = (verifyData.values?.[0]?.[0] || '').trim();
    
    if (currentCellValue !== normalizedId) {
      console.warn(`[RACE CONDITION] Row ${rowNumber} shifted! Expected "${normalizedId}" but found "${currentCellValue}". Re-scanning...`);
      
      // Re-scan the entire sheet to find the correct row
      const rescanResp = await fetchWithRetry(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'BOOKED CLIENTS EVENT DETAILS'!A2:A500")}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (rescanResp.ok) {
        const rescanData = await rescanResp.json();
        let newRowFound = false;
        
        if (rescanData.values) {
          for (let ri = 0; ri < rescanData.values.length; ri++) {
            if ((rescanData.values[ri][0] || '').trim() === normalizedId) {
              verifiedRowNumber = ri + 2;
              newRowFound = true;
              console.log(`[RACE CONDITION] Found correct row at ${verifiedRowNumber}`);
              break;
            }
          }
        }
        
        if (!newRowFound) {
          throw new Error(`[RACE CONDITION] Client ${normalizedId} no longer found in EVENT DETAILS sheet after row shift`);
        }
      }
    }
  }

  // Write updated values back to columns J-AH using VERIFIED row number
  const updateRange = encodeURIComponent(`'BOOKED CLIENTS EVENT DETAILS'!J${verifiedRowNumber}:AH${verifiedRowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
  
  const updateResponse = await fetchWithRetry(updateUrl, {
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

// Get all clients from BOOKED CLIENTS sheet (same structure as CLIENT TRACKER: A-AJ)
// Now includes a lookup to resolve originalRowNumber from CLIENT TRACKER
async function getBookedClients(accessToken: string, spreadsheetId: string, limit = 100) {
  // 1. Fetch booked clients data (including Column AL for Benzo Keep notes)
  const range = encodeURIComponent("'BOOKED CLIENTS'!A2:AL" + (limit + 1));
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetchWithRetry(url, {
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
  const trackerResponse = await fetchWithRetry(
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
      companyName: row[33] || '',           // Column AH
      serviceTypes: row[34] || '',          // Column AI
      lastActivityLog: row[35] || '',       // Column AJ - Activity timestamp log
      priority: row[36] || '',              // Column AK - Star rating (1-5)
      benzoKeepNotes: row[37] || '',        // Column AL - Benzo Keep notes (JSON)
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

// Resync all booked clients: sync NON-PAYMENT data from CLIENT TRACKER to BOOKED CLIENTS
// IMPORTANT: Payment columns (AE=30, AF=31, AG=32) are NEVER overwritten.
// BOOKED CLIENTS is the single source of truth for payment data.
async function resyncAllBookedClients(accessToken: string, spreadsheetId: string) {
  console.log('[RESYNC] Starting resync of booked clients (payment columns protected)...');
  
  // Get all data from CLIENT TRACKER (full row for non-payment comparison)
  const trackerRange = encodeURIComponent("'CLIENT TRACKER'!A2:AI2000");
  const trackerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerRange}`;
  
  const trackerResponse = await fetch(trackerUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!trackerResponse.ok) {
    throw new Error('Failed to fetch CLIENT TRACKER data');
  }
  
  const trackerData = await trackerResponse.json();
  const trackerRows = trackerData.values || [];
  
  // Build a map of registeredDateTimeAD -> full row data from CLIENT TRACKER
  const trackerMap: Record<string, { row: string[]; rowNumber: number }> = {};
  
  for (let i = 0; i < trackerRows.length; i++) {
    const row = trackerRows[i];
    const registeredDateTime = (row[0] || '').trim();
    if (registeredDateTime) {
      trackerMap[registeredDateTime] = { row, rowNumber: i + 2 };
    }
  }
  
  console.log(`[RESYNC] Built tracker map with ${Object.keys(trackerMap).length} entries`);
  
  // Get all data from BOOKED CLIENTS
  const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:AI500");
  const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`;
  
  const bookedResponse = await fetch(bookedUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!bookedResponse.ok) {
    throw new Error('Failed to fetch BOOKED CLIENTS data');
  }
  
  const bookedData = await bookedResponse.json();
  const bookedRows = bookedData.values || [];
  
  // Payment column indices to SKIP: AE=30, AF=31, AG=32
  const PAYMENT_COLS = new Set([30, 31, 32]);
  
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
    
    const trackerEntry = trackerMap[registeredDateTime];
    
    if (!trackerEntry) {
      console.log(`[RESYNC] No match in tracker for booked row ${bookedRowNumber}: ${registeredDateTime.substring(0, 20)}...`);
      notFoundCount++;
      continue;
    }
    
    // Compare ONLY non-payment columns to determine if update is needed
    const maxLen = Math.max(row.length, trackerEntry.row.length);
    let needsUpdate = false;
    for (let col = 0; col < maxLen; col++) {
      if (PAYMENT_COLS.has(col)) continue; // Skip payment columns
      const bookedVal = String(row[col] || '');
      const trackerVal = String(trackerEntry.row[col] || '');
      if (bookedVal !== trackerVal) {
        needsUpdate = true;
        break;
      }
    }
    
    if (needsUpdate) {
      // Build updated row: use tracker data for all columns EXCEPT payment columns
      // For payment columns, preserve the existing BOOKED CLIENTS values
      const updatedRow: string[] = [];
      const totalCols = Math.max(row.length, trackerEntry.row.length, 35); // at least up to AI
      for (let col = 0; col < totalCols; col++) {
        if (PAYMENT_COLS.has(col)) {
          // PRESERVE existing booked payment data
          updatedRow.push(row[col] || '');
        } else {
          // Use tracker data for non-payment columns
          updatedRow.push(trackerEntry.row[col] || '');
        }
      }
      
      const updateRange = encodeURIComponent(`'BOOKED CLIENTS'!A${bookedRowNumber}:AI${bookedRowNumber}`);
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
      
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [updatedRow] }),
      });
      
      if (updateResponse.ok) {
        console.log(`[RESYNC] Synced row ${bookedRowNumber} from tracker row ${trackerEntry.rowNumber} (payment data preserved)`);
        syncedCount++;
      } else {
        console.error(`[RESYNC] Failed to update row ${bookedRowNumber}:`, await updateResponse.text());
      }
    } else {
      skippedCount++;
    }
  }
  
  console.log(`[RESYNC] Complete: ${syncedCount} synced, ${skippedCount} unchanged, ${notFoundCount} not found in tracker`);
  
  // Auto-cleanup: remove any booked clients that are still lingering in CLIENT TRACKER
  console.log('[RESYNC] Running auto-cleanup of duplicate booked clients from tracker...');
  try {
    const cleanupResult = await cleanupDuplicateBookedFromTracker(accessToken, spreadsheetId);
    console.log(`[RESYNC] Cleanup complete: ${cleanupResult.deletedCount} duplicates removed from tracker`);
  } catch (cleanupError) {
    console.error('[RESYNC] Cleanup failed (non-fatal):', cleanupError);
  }
  
  return { success: true, syncedCount, skippedCount, notFoundCount, totalBooked: bookedRows.length };
}

// Full resync all booked clients: sync ALL data (columns A-AI) from CLIENT TRACKER to BOOKED CLIENTS
// Helper: Extract the LATEST status from a status log (returns the most recent status entry)
function getLatestStatusFromLog(statusLog: string): string {
  if (!statusLog) return '';
  
  // Status log format: "STATUS [timestamp]\nSTATUS - timestamp\n..."
  // Split by newlines and get the last non-empty entry
  const entries = statusLog.split('\n').filter(e => e.trim());
  if (entries.length === 0) return '';
  
  const lastEntry = entries[entries.length - 1].trim().toUpperCase();
  
  // Extract just the status part (before any timestamp markers like [ or -)
  // Format examples: "BOOKED [2026-01-28 12:14:59]" or "ADVANCE PENDING - 01/29/2026, 20:55:20"
  const statusMatch = lastEntry.match(/^([A-Z\s:]+?)(?:\s*[\[\-]|$)/);
  if (statusMatch) {
    return statusMatch[1].trim();
  }
  
  return lastEntry;
}

// ============= CLEANUP DUPLICATE BOOKED CLIENTS FROM TRACKER =============
// One-time cleanup function to delete BOOKED clients from CLIENT TRACKER
// that already exist in BOOKED CLIENTS sheet (single source of truth architecture)
async function cleanupDuplicateBookedFromTracker(accessToken: string, spreadsheetId: string) {
  console.log('[CLEANUP] Starting cleanup of duplicate BOOKED clients from CLIENT TRACKER...');
  
  // 1. Get all registeredDateTimeAD from BOOKED CLIENTS
  const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:C1000");
  const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`;
  
  const bookedResponse = await fetch(bookedUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!bookedResponse.ok) {
    throw new Error('Failed to fetch BOOKED CLIENTS for cleanup');
  }
  
  const bookedData = await bookedResponse.json();
  const bookedRows = bookedData.values || [];
  
  // Build set of booked client IDs
  const bookedIds = new Set<string>();
  const bookedClientNames = new Map<string, string>();
  for (const row of bookedRows) {
    const id = (row[0] || '').trim();
    const name = (row[2] || '').trim();
    if (id) {
      bookedIds.add(id);
      bookedClientNames.set(id, name);
    }
  }
  
  console.log(`[CLEANUP] Found ${bookedIds.size} clients in BOOKED CLIENTS sheet`);
  
  // 2. Get all rows from CLIENT TRACKER with their registeredDateTimeAD
  const trackerRange = encodeURIComponent("'CLIENT TRACKER'!A2:C2000");
  const trackerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerRange}`;
  
  const trackerResponse = await fetch(trackerUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!trackerResponse.ok) {
    throw new Error('Failed to fetch CLIENT TRACKER for cleanup');
  }
  
  const trackerData = await trackerResponse.json();
  const trackerRows = trackerData.values || [];
  
  // 3. Find rows to delete (exist in both sheets)
  const rowsToDelete: { rowNumber: number; clientName: string; registeredDateTime: string }[] = [];
  
  for (let i = 0; i < trackerRows.length; i++) {
    const row = trackerRows[i];
    const registeredDateTime = (row[0] || '').trim();
    const clientName = (row[2] || '').trim();
    
    if (registeredDateTime && bookedIds.has(registeredDateTime)) {
      rowsToDelete.push({
        rowNumber: i + 2, // Sheet row (1-indexed, header is row 1)
        clientName: clientName || bookedClientNames.get(registeredDateTime) || 'Unknown',
        registeredDateTime
      });
    }
  }
  
  console.log(`[CLEANUP] Found ${rowsToDelete.length} duplicate clients to delete from TRACKER`);
  
  if (rowsToDelete.length === 0) {
    return {
      success: true,
      deletedCount: 0,
      deletedClients: [],
      message: 'No duplicates found - CLIENT TRACKER is already clean'
    };
  }
  
  // 4. Delete rows in REVERSE order (highest row first) to avoid index shifting
  rowsToDelete.sort((a, b) => b.rowNumber - a.rowNumber);
  
  const deletedClients: string[] = [];
  let deletedCount = 0;
  
  for (const { rowNumber, clientName, registeredDateTime } of rowsToDelete) {
    try {
      await deleteTrackerRow(accessToken, spreadsheetId, rowNumber);
      deletedClients.push(clientName);
      deletedCount++;
      console.log(`[CLEANUP] Deleted "${clientName}" from TRACKER row ${rowNumber}`);
    } catch (error) {
      console.error(`[CLEANUP] Failed to delete row ${rowNumber} (${clientName}):`, error);
    }
  }
  
  console.log(`[CLEANUP] Complete: Deleted ${deletedCount} duplicate clients from CLIENT TRACKER`);
  
  return {
    success: true,
    deletedCount,
    deletedClients,
    message: `Successfully removed ${deletedCount} duplicate BOOKED clients from CLIENT TRACKER`
  };
}

// ============= COMPREHENSIVE FULL RESYNC FUNCTION =============
// SINGLE SOURCE OF TRUTH ARCHITECTURE:
// - BOOKED clients ONLY exist in BOOKED CLIENTS sheet
// - This function NO LONGER copies clients between sheets
// - It only validates and refreshes existing data in BOOKED CLIENTS
// - The ONLY way to add a client to BOOKED CLIENTS is via status change to "BOOKED"
async function fullResyncAllBookedClients(accessToken: string, spreadsheetId: string, forceSync: boolean = false) {
  console.log(`[FULL RESYNC] Starting ${forceSync ? 'FORCED' : 'normal'} data validation for booked clients...`);
  console.log('[FULL RESYNC] NOTE: This sync only validates existing data - it does NOT copy clients between sheets');
  
  // Get all data from BOOKED CLIENTS
  const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:AI500");
  const bookedUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`;
  
  const bookedResponse = await fetch(bookedUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!bookedResponse.ok) {
    throw new Error('Failed to fetch BOOKED CLIENTS data for validation');
  }
  
  const bookedData = await bookedResponse.json();
  const bookedRows = bookedData.values || [];
  
  console.log(`[FULL RESYNC] Found ${bookedRows.length} booked clients to validate`);
  
  // No Phase 0 (restore to tracker) - REMOVED per single source of truth
  // No Phase 1 (copy to booked) - REMOVED per single source of truth
  // Only validate existing BOOKED CLIENTS data integrity
  
  let validatedCount = 0;
  let skippedCount = 0;
  
  // Track detailed sync info for report
  const syncDetails: { 
    clientName: string; 
    bookedRow: number; 
    trackerRow: number; 
    changedColumns: string[];
  }[] = [];
  
  // NOTE: Under single source of truth, BOOKED CLIENTS is authoritative
  // We no longer sync FROM tracker TO booked (that would violate single source of truth)
  // This function now only validates data integrity
  
  for (let i = 0; i < bookedRows.length; i++) {
    const row = bookedRows[i];
    const registeredDateTime = (row[0] || '').trim();
    
    if (!registeredDateTime) {
      skippedCount++;
      continue;
    }
    
    // Count as validated
    validatedCount++;
  }
  
  console.log(`[FULL RESYNC] Complete: ${validatedCount} validated, ${skippedCount} skipped (empty)`);
  console.log('[FULL RESYNC] NOTE: Copying between sheets is now disabled. Clients enter BOOKED CLIENTS only via status change.');
  
  return { 
    success: true, 
    restoredToTrackerCount: 0, // DEPRECATED - always 0 now
    restoredToTracker: [],     // DEPRECATED - always empty now
    copiedCount: 0,            // DEPRECATED - always 0 now (no copying)
    syncedCount: 0,            // No actual sync needed
    skippedCount: validatedCount, // All existing clients are valid
    notFoundCount: 0, 
    totalBooked: bookedRows.length,
    syncDetails,
    message: 'Validated existing data. Clients enter BOOKED CLIENTS only via status change to BOOKED.'
  };
}

// Update a booked client in BOOKED CLIENTS and CLIENT TRACKER sheets
// IMPORTANT: Payment columns (AE, AF, AG) are ONLY written to BOOKED CLIENTS (single source of truth)
// Other columns sync to both sheets
async function updateBookedClient(
  accessToken: string, 
  spreadsheetId: string, 
  bookedRowNumber: number,
  originalRowNumber: number,
  updates: Record<string, unknown>
) {
  // Column mapping (A-AG identical in both sheets)
  const columnMap: Record<string, string> = {
    finalQuotation: 'AD',     // Column AD (index 29)
    paymentsMade: 'AE',       // Column AE (index 30) - BOOKED CLIENTS ONLY
    paymentDatesAD: 'AF',     // Column AF (index 31) - BOOKED CLIENTS ONLY
    remainingPayment: 'AG',   // Column AG (index 32) - BOOKED CLIENTS ONLY
    clientHandler: 'X',       // Column X (index 23)
    comments: 'AC',           // Column AC (index 28)
    mindset: 'Z',             // Column Z (index 25)
    ourBargainedRates: 'AA',  // Column AA (index 26)
    clientBargainedRates: 'AB', // Column AB (index 27)
    callLog: 'Y',             // Column Y (index 24)
    quotationData: 'V',       // Column V (index 21)
    statusLog: 'W',           // Column W (index 22)
  };

  // Payment columns - only write to BOOKED CLIENTS (single source of truth)
  const paymentOnlyFields = ['paymentsMade', 'paymentDatesAD', 'remainingPayment'];

  // Update each field
  for (const [field, value] of Object.entries(updates)) {
    const column = columnMap[field];
    
    if (column && value !== undefined) {
      // Always update BOOKED CLIENTS
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
      
      // REMOVED: No longer sync to CLIENT TRACKER. 
      // Booked clients should ONLY exist in BOOKED CLIENTS sheet (single source of truth).
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

// ============= RECONCILE BOOKED CLIENTS =============
// Finds clients marked as 'booked' in Supabase DB but still present in CLIENT TRACKER sheet,
// and performs proper MOVE (copy to Booked, delete from Tracker).
async function reconcileBookedClients(accessToken: string, spreadsheetId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.49.2");
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  // Step 1: Get all DB records marked as booked
  const { data: bookedInDb, error: dbErr } = await supabaseAdmin
    .from('clients_cache')
    .select('registered_date_time_ad, client_name, status_log, payments_made, payment_dates_ad, remaining_payment')
    .eq('sheet_source', 'booked');

  if (dbErr || !bookedInDb) {
    throw new Error(`Failed to read booked clients from DB: ${dbErr?.message}`);
  }

  // Step 2: Read CLIENT TRACKER column A to find which booked clients are still there
  const trackerRange = encodeURIComponent("'CLIENT TRACKER'!A2:A5000");
  const trackerResp = await fetchWithRetry(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${trackerRange}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!trackerResp.ok) throw new Error('Failed to read CLIENT TRACKER');
  const trackerData = await trackerResp.json();
  const trackerIds = new Map<string, number>();
  if (trackerData.values) {
    for (let i = 0; i < trackerData.values.length; i++) {
      const id = (trackerData.values[i][0] || '').trim();
      if (id) trackerIds.set(id, i + 2); // row number = index + 2
    }
  }

  // Step 3: Find stuck clients (booked in DB, still in tracker sheet)
  const stuckClients: { id: string; name: string; trackerRow: number }[] = [];
  for (const row of bookedInDb) {
    const trackerRow = trackerIds.get(row.registered_date_time_ad);
    if (trackerRow) {
      stuckClients.push({
        id: row.registered_date_time_ad,
        name: row.client_name || 'Unknown',
        trackerRow,
      });
    }
  }

  if (stuckClients.length === 0) {
    return { success: true, reconciledCount: 0, message: 'No stuck clients found' };
  }

  console.log(`[RECONCILE] Found ${stuckClients.length} stuck booked clients in tracker`);

  // Step 4: For each stuck client, check if already in BOOKED sheet, then MOVE
  let movedCount = 0;
  const reconciledClients: string[] = [];

  for (const stuck of stuckClients) {
    try {
      const alreadyBooked = await checkIfAlreadyBooked(accessToken, spreadsheetId, stuck.id);

      if (!alreadyBooked) {
        // Copy to BOOKED CLIENTS first
        await copyToBookedClients(accessToken, spreadsheetId, stuck.trackerRow);
        console.log(`[RECONCILE] Copied ${stuck.name} to BOOKED CLIENTS from tracker row ${stuck.trackerRow}`);
      }

      // Delete from tracker regardless (the booked sheet has the record)
      await deleteTrackerRow(accessToken, spreadsheetId, stuck.trackerRow);
      console.log(`[RECONCILE] Deleted ${stuck.name} from CLIENT TRACKER row ${stuck.trackerRow}`);

      // Patch payment columns on booked row from DB
      const dbRow = bookedInDb.find(r => r.registered_date_time_ad === stuck.id);
      if (dbRow && (dbRow.payments_made || dbRow.payment_dates_ad || dbRow.remaining_payment)) {
        const bookedRowNum = await findBookedClientRow(accessToken, spreadsheetId, stuck.id);
        if (bookedRowNum) {
          const patchRange = encodeURIComponent(`'BOOKED CLIENTS'!AE${bookedRowNum}:AG${bookedRowNum}`);
          const patchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${patchRange}?valueInputOption=USER_ENTERED`;
          await fetchWithRetry(patchUrl, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [[dbRow.payments_made || '', dbRow.payment_dates_ad || '', dbRow.remaining_payment || '']] }),
          });
          console.log(`[RECONCILE] Patched payment data for ${stuck.name} on booked row ${bookedRowNum}`);
        }
      }

      // Trigger downstream syncs
      try { await syncToEventDetails(accessToken, spreadsheetId, stuck.id); } catch (e) { console.warn(`[RECONCILE] Event sync failed for ${stuck.name}:`, e); }
      try { await syncSingleClientToFreelancers(accessToken, spreadsheetId, stuck.id); } catch (e) { console.warn(`[RECONCILE] Freelancer sync failed for ${stuck.name}:`, e); }
      try { await resyncClientContactDetails(accessToken, spreadsheetId, stuck.id); } catch (e) { console.warn(`[RECONCILE] Contact sync failed for ${stuck.name}:`, e); }

      movedCount++;
      reconciledClients.push(stuck.name);
    } catch (err) {
      console.error(`[RECONCILE] Failed to reconcile ${stuck.name}:`, err);
    }
  }

  return {
    success: true,
    reconciledCount: movedCount,
    reconciledClients,
    totalStuck: stuckClients.length,
  };
}

// ============= DELETE CLIENT FROM ALL SHEETS + SUPABASE =============
async function deleteClientFromAll(
  accessToken: string,
  spreadsheetId: string,
  registeredDateTimeAD: string,
  sheetSource: string
) {
  console.log(`[DELETE CLIENT] Starting deletion for ${registeredDateTimeAD} from ${sheetSource}`);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // 1. Delete from main sheet (CLIENT TRACKER or BOOKED CLIENTS)
  const mainSheetName = sheetSource === 'booked' ? 'BOOKED CLIENTS' : 'CLIENT TRACKER';
  await deleteRowsByColumnA(accessToken, spreadsheetId, mainSheetName, registeredDateTimeAD);

  // 2. Delete from BOOKED CLIENTS EVENT DETAILS
  await deleteRowsByColumnA(accessToken, spreadsheetId, 'BOOKED CLIENTS EVENT DETAILS', registeredDateTimeAD);

  // 3. Delete from BOOKED CLIENTS FREELANCERS
  await deleteRowsByColumnA(accessToken, spreadsheetId, 'BOOKED CLIENTS FREELANCERS', registeredDateTimeAD);

  // 4. Delete from BOOKED CLIENTS CONTACT DETAILS
  await deleteRowsByColumnA(accessToken, spreadsheetId, 'BOOKED CLIENTS CONTACT DETAILS', registeredDateTimeAD);

  // 5. Delete from BOOKED CLIENTS VIDEO EDIT TRACKER
  await deleteRowsByColumnA(accessToken, spreadsheetId, 'BOOKED CLIENTS VIDEO EDIT TRACKER', registeredDateTimeAD);

  // 6. Delete from all Supabase cache tables
  const tables = ['clients_cache', 'event_details_cache', 'contact_details_cache', 'freelancer_assignments', 'freelancer_event_settings', 'client_deliverables'];
  for (const table of tables) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?registered_date_time_ad=eq.${encodeURIComponent(registeredDateTimeAD)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
      });
      console.log(`[DELETE CLIENT] Supabase ${table}: ${res.status}`);
    } catch (e) {
      console.warn(`[DELETE CLIENT] Failed to delete from ${table}:`, e);
    }
  }

  console.log(`[DELETE CLIENT] Completed deletion for ${registeredDateTimeAD}`);
  return { success: true };
}

// Helper: Find and delete all rows in a sheet where Column A matches registeredDateTimeAD
async function deleteRowsByColumnA(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  registeredDateTimeAD: string
) {
  try {
    // Get sheet data to find matching rows
    const range = encodeURIComponent(`'${sheetName}'!A:A`);
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.warn(`[DELETE CLIENT] Sheet "${sheetName}" not accessible: ${response.status}`);
      return;
    }

    const data = await response.json();
    if (!data.values) return;

    // Find all matching row indices (0-indexed)
    const matchingRows: number[] = [];
    for (let i = 0; i < data.values.length; i++) {
      if (data.values[i]?.[0] === registeredDateTimeAD) {
        matchingRows.push(i);
      }
    }

    if (matchingRows.length === 0) {
      console.log(`[DELETE CLIENT] No matching rows in "${sheetName}"`);
      return;
    }

    // Get sheet ID
    const sheetId = await getSheetId(accessToken, spreadsheetId, sheetName);

    // Delete rows in REVERSE order to avoid index shifting
    const requests = matchingRows
      .sort((a, b) => b - a)
      .map(rowIndex => ({
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1,
          },
        },
      }));

    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const batchResponse = await fetchWithRetry(batchUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!batchResponse.ok) {
      const errorText = await batchResponse.text();
      console.error(`[DELETE CLIENT] Failed to delete rows from "${sheetName}":`, errorText);
    } else {
      console.log(`[DELETE CLIENT] Deleted ${matchingRows.length} row(s) from "${sheetName}"`);
    }
  } catch (e) {
    console.warn(`[DELETE CLIENT] Error processing "${sheetName}":`, e);
  }
}



const FREELANCER_CATEGORY_SHEETS = [
  { sheet: 'PHOTOGRAPHER', check: (d: Record<string, unknown>) => String(d.photographer || '').toUpperCase() === 'YES' },
  { sheet: 'VIDEOGRAPHER', check: (d: Record<string, unknown>) => String(d.videographer || '').toUpperCase() === 'YES' },
  { sheet: 'PHOTO EDITOR', check: (d: Record<string, unknown>) => String(d.photoEditor || '').toUpperCase() === 'YES' },
  { sheet: 'VIDEO EDITOR', check: (d: Record<string, unknown>) => String(d.videoEditor || '').toUpperCase() === 'YES' },
  { sheet: 'HYBRID SHOOTER', check: (d: Record<string, unknown>) => String(d.photographer || '').toUpperCase() === 'YES' && String(d.videographer || '').toUpperCase() === 'YES' },
  { sheet: 'HYBRID EDITOR', check: (d: Record<string, unknown>) => String(d.photoEditor || '').toUpperCase() === 'YES' && String(d.videoEditor || '').toUpperCase() === 'YES' },
  { sheet: 'DRONE OPERATOR', check: (d: Record<string, unknown>) => String(d.droneOperator || '').toUpperCase() === 'YES' },
  { sheet: 'FPV OPERATOR', check: (d: Record<string, unknown>) => String(d.fpvOperator || '').toUpperCase() === 'YES' },
  { sheet: 'IPHONE SHOOTER', check: (d: Record<string, unknown>) => String(d.iphoneShooter || '').toUpperCase() === 'YES' },
];

function freelancerRowValues(d: Record<string, unknown>): string[] {
  return [
    (d.name as string) || '',
    (d.contactNo as string) || '',
    (d.whatsappNo as string) || '',
    (d.instagram as string) || '',
    (d.facebook as string) || '',
    (d.city as string) || '',
    (d.area as string) || '',
    (d.mapLink as string) || '',
    (d.pathaoLandmark as string) || '',
    (d.mainJob as string) || '',
    (d.photographer as string) || 'NO',
    (d.videographer as string) || 'NO',
    (d.photoEditor as string) || 'NO',
    (d.videoEditor as string) || 'NO',
    (d.hybridShooter as string) || 'NO',
    (d.hybridEditor as string) || 'NO',
    (d.droneOperator as string) || 'NO',
    (d.fpvOperator as string) || 'NO',
    (d.iphoneShooter as string) || 'NO',
  ];
}

async function mirrorToFreelancerCategorySheets(
  accessToken: string, spreadsheetId: string, d: Record<string, unknown>
) {
  const name = (d.name as string) || '';
  if (!name) return;

  const rowData = freelancerRowValues(d);

  for (const cat of FREELANCER_CATEGORY_SHEETS) {
    const shouldExist = cat.check(d);

    try {
      // Read existing rows to find by name
      const range = encodeURIComponent(`'${cat.sheet}'!A2:S500`);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });

      if (!res.ok) {
        // Sheet might not exist, skip
        console.log(`[FREELANCER MIRROR] Sheet '${cat.sheet}' not accessible, skipping`);
        continue;
      }

      const sheetData = await res.json();
      const rows = sheetData.values || [];
      const existingRowIdx = rows.findIndex((r: string[]) => r[0]?.toLowerCase() === name.toLowerCase());

      if (shouldExist) {
        if (existingRowIdx >= 0) {
          // Update existing row
          const updateRow = existingRowIdx + 2;
          const updateRange = encodeURIComponent(`'${cat.sheet}'!A${updateRow}:S${updateRow}`);
          const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
          await fetch(updateUrl, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [rowData] }),
          });
        } else {
          // Add new row at row 2
          const sheetId = await getSheetId(accessToken, spreadsheetId, cat.sheet);
          const insertUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
          await fetch(insertUrl, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [{ insertDimension: { range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 }, inheritFromBefore: false } }],
            }),
          });
          const writeRange = encodeURIComponent(`'${cat.sheet}'!A2:S2`);
          const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`;
          await fetch(writeUrl, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ values: [rowData] }),
          });
        }
      } else if (existingRowIdx >= 0) {
        // Remove from sheet
        const sheetId = await getSheetId(accessToken, spreadsheetId, cat.sheet);
        const deleteRow = existingRowIdx + 2;
        const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
        await fetch(deleteUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: deleteRow - 1, endIndex: deleteRow } } }],
          }),
        });
      }
    } catch (e) {
      console.error(`[FREELANCER MIRROR] Error mirroring to ${cat.sheet}:`, e);
    }
  }
}

async function getFreelancersData(accessToken: string, spreadsheetId: string, limit = 500) {
  const range = encodeURIComponent("'FREELANCERS'!A2:S" + (limit + 1));
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Sheets API error: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();
  if (!data.values) return [];

  return data.values.map((row: string[], index: number) => ({
    rowNumber: index + 2,
    name: row[0] || '',
    contactNo: row[1] || '',
    whatsappNo: row[2] || '',
    instagram: row[3] || '',
    facebook: row[4] || '',
    city: row[5] || '',
    area: row[6] || '',
    mapLink: row[7] || '',
    pathaoLandmark: row[8] || '',
    mainJob: row[9] || '',
    photographer: row[10] || 'NO',
    videographer: row[11] || 'NO',
    photoEditor: row[12] || 'NO',
    videoEditor: row[13] || 'NO',
    hybridShooter: row[14] || 'NO',
    hybridEditor: row[15] || 'NO',
    droneOperator: row[16] || 'NO',
    fpvOperator: row[17] || 'NO',
    iphoneShooter: row[18] || 'NO',
  }));
}

async function addFreelancerData(accessToken: string, spreadsheetId: string, d: Record<string, unknown>) {
  const sheetId = await getSheetId(accessToken, spreadsheetId, 'FREELANCERS');

  // Insert row at position 2
  const insertUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  await fetch(insertUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ insertDimension: { range: { sheetId, dimension: 'ROWS', startIndex: 1, endIndex: 2 }, inheritFromBefore: false } }],
    }),
  });

  const values = [freelancerRowValues(d)];
  const range = encodeURIComponent("'FREELANCERS'!A2:S2");
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add freelancer: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  // Mirror to category sheets
  await mirrorToFreelancerCategorySheets(accessToken, spreadsheetId, d);

  return { success: true };
}

async function updateFreelancerData(accessToken: string, spreadsheetId: string, d: Record<string, unknown>) {
  const rowNumber = d.rowNumber as number;
  if (!rowNumber || rowNumber < 2) throw new Error('Valid rowNumber is required');

  const values = [freelancerRowValues(d)];
  const range = encodeURIComponent(`'FREELANCERS'!A${rowNumber}:S${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to update freelancer: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  // Mirror to category sheets
  await mirrorToFreelancerCategorySheets(accessToken, spreadsheetId, d);

  return { success: true };
}

async function deleteFreelancerData(accessToken: string, spreadsheetId: string, rowNumber: number, name?: string) {
  if (!rowNumber || rowNumber < 2) throw new Error('Valid rowNumber is required');

  const sheetId = await getSheetId(accessToken, spreadsheetId, 'FREELANCERS');

  const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const response = await fetch(deleteUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber } } }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete freelancer: ${response.status} - ${errorText.substring(0, 200)}`);
  }

  // Remove from all category sheets by name
  if (name) {
    for (const cat of FREELANCER_CATEGORY_SHEETS) {
      try {
        const range = encodeURIComponent(`'${cat.sheet}'!A2:A500`);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!res.ok) continue;

        const data = await res.json();
        const rows = data.values || [];
        const idx = rows.findIndex((r: string[]) => r[0]?.toLowerCase() === name.toLowerCase());

        if (idx >= 0) {
          const catSheetId = await getSheetId(accessToken, spreadsheetId, cat.sheet);
          const delRow = idx + 2;
          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [{ deleteDimension: { range: { sheetId: catSheetId, dimension: 'ROWS', startIndex: delRow - 1, endIndex: delRow } } }],
            }),
          });
        }
      } catch (e) {
        console.error(`[FREELANCER DELETE] Error removing from ${cat.sheet}:`, e);
      }
    }
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

// ============= FREELANCER ASSIGNMENT FUNCTIONS =============

const FREELANCER_ASSIGNMENT_FIELDS = [
  'photographerBride', 'photographerGroom', 'videographerBride', 'videographerGroom',
  'extraPhotographer', 'extraVideographer', 'assistant', 'iphoneShooter',
  'droneOperator', 'fpvOperator'
];

const FIELD_TO_COL_INDEX: Record<string, number> = {
  photographerBride: 8,   // I
  photographerGroom: 9,   // J
  videographerBride: 10,  // K
  videographerGroom: 11,  // L
  extraPhotographer: 12,  // M
  extraVideographer: 13,  // N
  assistant: 14,          // O
  iphoneShooter: 15,      // P
  droneOperator: 16,      // Q
  fpvOperator: 17,        // R
};

// ============= GET ALL FREELANCER ASSIGNMENTS (BULK) =============
async function getAllFreelancerAssignments(accessToken: string, spreadsheetId: string) {
  const flRange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:AA5000");
  const flUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${flRange}`;
  const flResp = await fetchWithRetry(flUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!flResp.ok) {
    const errText = await flResp.text();
    throw new Error(`Failed to read freelancer assignments: ${flResp.status} - ${errText.substring(0, 200)}`);
  }
  const flData = await flResp.json();
  const rows: string[][] = flData.values || [];

  const allAssignments: Record<string, unknown>[] = [];

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    const registeredDateTimeAD = (row[0] || '').trim();
    if (!registeredDateTimeAD) continue;

    const clientName = (row[2] || '').trim();
    const eventNames = (row[3] || '').split('\n');
    const eventYears = (row[4] || '').split('\n');
    const eventMonths = (row[5] || '').split('\n');
    const eventDays = (row[6] || '').split('\n');
    const eventDatesAD = (row[7] || '').split('\n');
    const requiredCategoriesLines = (row[26] || '').split('\n');

    const eventCount = eventNames.filter((n: string) => n.trim()).length;
    if (eventCount === 0) continue;

    for (let i = 0; i < eventCount; i++) {
      const name = (eventNames[i] || '').trim();
      if (!name) continue;
      allAssignments.push({
        rowNumber: rowIdx + 2,
        registeredDateTimeAD,
        clientName,
        event: name,
        eventYear: (eventYears[i] || '').trim(),
        eventMonth: (eventMonths[i] || '').trim(),
        eventDay: (eventDays[i] || '').trim(),
        eventDateAD: (eventDatesAD[i] || '').trim(),
        photographerBride: ((row[8] || '').split('\n')[i] || '').trim(),
        photographerGroom: ((row[9] || '').split('\n')[i] || '').trim(),
        videographerBride: ((row[10] || '').split('\n')[i] || '').trim(),
        videographerGroom: ((row[11] || '').split('\n')[i] || '').trim(),
        extraPhotographer: ((row[12] || '').split('\n')[i] || '').trim(),
        extraVideographer: ((row[13] || '').split('\n')[i] || '').trim(),
        assistant: ((row[14] || '').split('\n')[i] || '').trim(),
        iphoneShooter: ((row[15] || '').split('\n')[i] || '').trim(),
        droneOperator: ((row[16] || '').split('\n')[i] || '').trim(),
        fpvOperator: ((row[17] || '').split('\n')[i] || '').trim(),
        requiredCategories: (requiredCategoriesLines[i] || '').trim(),
      });
    }
  }

  console.log(`[GET ALL ASSIGNMENTS] Returned ${allAssignments.length} event rows from ${rows.length} client rows`);
  return allAssignments;
}

async function getClientFreelancerAssignments(accessToken: string, spreadsheetId: string, registeredDateTimeAD: string) {
  // 1. Read event details for this client (single row with newline-separated values)
  const eventRange = encodeURIComponent("'BOOKED CLIENTS EVENT DETAILS'!A2:H1000");
  const eventUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${eventRange}`;
  const eventResp = await fetch(eventUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!eventResp.ok) throw new Error('Failed to read event details');
  const eventData = await eventResp.json();
  const eventRows = eventData.values || [];

  const clientEventRow = eventRows.find((r: string[]) => (r[0] || '').trim() === registeredDateTimeAD.trim());
  if (!clientEventRow) return [];

  // Parse newline-separated events
  const eventNames = (clientEventRow[3] || '').split('\n');
  const eventYears = (clientEventRow[4] || '').split('\n');
  const eventMonths = (clientEventRow[5] || '').split('\n');
  const eventDays = (clientEventRow[6] || '').split('\n');
  const eventDatesAD = (clientEventRow[7] || '').split('\n');
  const clientName = (clientEventRow[2] || '').trim();
  const regDateTimeAD = clientEventRow[0] || '';
  const regDateBS = clientEventRow[1] || '';

  const eventCount = eventNames.filter((n: string) => n.trim()).length;
  if (eventCount === 0) return [];

  // 2. Read freelancers sheet - find SINGLE row for this client
  const flRange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:AA1000");
  const flUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${flRange}`;
  const flResp = await fetch(flUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  let flRows: string[][] = [];
  if (flResp.ok) {
    const flData = await flResp.json();
    flRows = flData.values || [];
  }

  let clientRowIdx = flRows.findIndex((r: string[]) => (r[0] || '').trim() === registeredDateTimeAD.trim());

  // Build the empty newline template matching event count
  const emptyNewlines = Array(eventCount).fill('').join('\n');

  if (clientRowIdx === -1) {
    // Create a single row with Cols A-H copied and I-R as empty newline-separated
    const newRow = [
      regDateTimeAD, regDateBS, clientName,
      clientEventRow[3] || '', clientEventRow[4] || '', clientEventRow[5] || '', clientEventRow[6] || '', clientEventRow[7] || '',
      emptyNewlines, emptyNewlines, emptyNewlines, emptyNewlines, emptyNewlines,
      emptyNewlines, emptyNewlines, emptyNewlines, emptyNewlines, emptyNewlines,
      '', '', '', '', '', '', '', '', // S-Z (unused)
      '' // AA (requiredCategories)
    ];
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A:AA")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    await fetch(appendUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [newRow] }),
    });
    flRows.push(newRow);
    clientRowIdx = flRows.length - 1;
  } else {
    // Update Cols A-H from event details (keep I-R freelancer data)
    const sheetRow = clientRowIdx + 2;
    const updateRange = encodeURIComponent(`'BOOKED CLIENTS FREELANCERS'!A${sheetRow}:H${sheetRow}`);
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
    await fetch(updateUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [[regDateTimeAD, regDateBS, clientName, clientEventRow[3] || '', clientEventRow[4] || '', clientEventRow[5] || '', clientEventRow[6] || '', clientEventRow[7] || '']] }),
    });
    // Update local copy
    flRows[clientRowIdx][0] = regDateTimeAD;
    flRows[clientRowIdx][1] = regDateBS;
    flRows[clientRowIdx][2] = clientName;
    for (let c = 3; c <= 7; c++) flRows[clientRowIdx][c] = clientEventRow[c] || '';
  }

  const row = flRows[clientRowIdx];

  // 3. Parse single row into individual event objects
  const assignments = [];
  for (let i = 0; i < eventCount; i++) {
    const name = (eventNames[i] || '').trim();
    if (!name) continue;
    assignments.push({
      rowNumber: clientRowIdx + 2,
      registeredDateTimeAD: row[0] || '',
      registeredDateBS: row[1] || '',
      clientName: row[2] || '',
      event: name,
      eventYear: (eventYears[i] || '').trim(),
      eventMonth: (eventMonths[i] || '').trim(),
      eventDay: (eventDays[i] || '').trim(),
      eventDateAD: (eventDatesAD[i] || '').trim(),
      photographerBride: ((row[8] || '').split('\n')[i] || '').trim(),
      photographerGroom: ((row[9] || '').split('\n')[i] || '').trim(),
      videographerBride: ((row[10] || '').split('\n')[i] || '').trim(),
      videographerGroom: ((row[11] || '').split('\n')[i] || '').trim(),
      extraPhotographer: ((row[12] || '').split('\n')[i] || '').trim(),
      extraVideographer: ((row[13] || '').split('\n')[i] || '').trim(),
      assistant: ((row[14] || '').split('\n')[i] || '').trim(),
      iphoneShooter: ((row[15] || '').split('\n')[i] || '').trim(),
      droneOperator: ((row[16] || '').split('\n')[i] || '').trim(),
      fpvOperator: ((row[17] || '').split('\n')[i] || '').trim(),
      requiredCategories: ((row[26] || '').split('\n')[i] || '').trim(),
    });
  }

  return assignments;
}

async function updateFreelancerAssignmentAction(accessToken: string, spreadsheetId: string, data: Record<string, unknown>) {
  const registeredDateTimeAD = data.registeredDateTimeAD as string;
  const eventName = (data.eventName as string).trim();
  const eventDateAD = (data.eventDateAD as string).trim();
  const field = data.field as string;
  const value = (data.value as string) || '';

  const colIndex = FIELD_TO_COL_INDEX[field];
  if (colIndex === undefined) throw new Error(`Invalid field: ${field}`);

  // Find the client's single row
  const flRange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:AA1000");
  const flUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${flRange}`;
  const flResp = await fetchWithRetry(flUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!flResp.ok) throw new Error('Failed to read freelancer assignments');
  const flData = await flResp.json();
  const rows = flData.values || [];

  const clientRowIdx = rows.findIndex((r: string[]) => (r[0] || '').trim() === registeredDateTimeAD.trim());
  if (clientRowIdx === -1) throw new Error('Client row not found in freelancers sheet');

  const row = rows[clientRowIdx];

  // Determine event index by matching event name + date within newline-separated values
  const eventNames = (row[3] || '').split('\n');
  const eventDatesInRow = (row[7] || '').split('\n');

  let eventIdx = -1;
  for (let i = 0; i < eventNames.length; i++) {
    if ((eventNames[i] || '').trim().toLowerCase() === eventName.toLowerCase() &&
        (eventDatesInRow[i] || '').trim() === eventDateAD) {
      eventIdx = i;
      break;
    }
  }
  // Fallback: match by event name only
  if (eventIdx === -1) {
    for (let i = 0; i < eventNames.length; i++) {
      if ((eventNames[i] || '').trim().toLowerCase() === eventName.toLowerCase()) {
        eventIdx = i;
        break;
      }
    }
  }
  if (eventIdx === -1) throw new Error('Event not found in client row');

  // Read current newline-separated value, update at index, write back
  const currentValues = (row[colIndex] || '').split('\n');
  // Ensure array is long enough
  while (currentValues.length <= eventIdx) currentValues.push('');
  currentValues[eventIdx] = value;
  const newCellValue = currentValues.join('\n');

  const sheetRow = clientRowIdx + 2;
  const colLetter = String.fromCharCode(65 + colIndex);
  const cellRange = encodeURIComponent(`'BOOKED CLIENTS FREELANCERS'!${colLetter}${sheetRow}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${cellRange}?valueInputOption=USER_ENTERED`;

  const resp = await fetchWithRetry(updateUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [[newCellValue]] }),
  });

  if (!resp.ok) throw new Error('Failed to update assignment');
  return { success: true };
}

// ============= RESTORE FREELANCER ASSIGNMENTS (BULK FROM CSV) =============
async function restoreFreelancerAssignmentsAction(
  accessToken: string,
  spreadsheetId: string,
  updates: { registeredDateTimeAD: string; event: string; assignments: Record<string, string> }[]
) {
  // Read all rows from FREELANCERS sheet
  const flRange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:AA1000");
  const flUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${flRange}`;
  const flResp = await fetchWithRetry(flUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!flResp.ok) throw new Error('Failed to read freelancer assignments');
  const flData = await flResp.json();
  const rows = flData.values || [];

  const crewFieldOrder = [
    'photographerBride', 'photographerGroom', 'videographerBride', 'videographerGroom',
    'extraPhotographer', 'extraVideographer', 'assistant', 'iphoneShooter',
    'droneOperator', 'fpvOperator'
  ];

  // Build batch update data
  const batchData: { range: string; values: string[][] }[] = [];
  let matchedCount = 0;

  for (const update of updates) {
    const clientRowIdx = rows.findIndex((r: string[]) => (r[0] || '').trim() === update.registeredDateTimeAD.trim());
    if (clientRowIdx === -1) continue;

    const row = rows[clientRowIdx];
    const eventNames = (row[3] || '').split('\n');

    // Find event index
    let eventIdx = -1;
    for (let i = 0; i < eventNames.length; i++) {
      if ((eventNames[i] || '').trim().toLowerCase() === update.event.trim().toLowerCase()) {
        eventIdx = i;
        break;
      }
    }
    if (eventIdx === -1) continue;

    matchedCount++;
    const sheetRow = clientRowIdx + 2;

    // For each crew field, update the newline-separated value at the correct event index
    for (const field of crewFieldOrder) {
      const colIndex = FIELD_TO_COL_INDEX[field];
      if (colIndex === undefined) continue;
      const newValue = update.assignments[field] || '';
      const currentValues = (row[colIndex] || '').split('\n');
      while (currentValues.length <= eventIdx) currentValues.push('');
      currentValues[eventIdx] = newValue;
      const newCellValue = currentValues.join('\n');

      // Update local copy for subsequent matches on same client
      while (!row[colIndex] && row.length <= colIndex) row.push('');
      row[colIndex] = newCellValue;

      const colLetter = String.fromCharCode(65 + colIndex);
      batchData.push({
        range: `'BOOKED CLIENTS FREELANCERS'!${colLetter}${sheetRow}`,
        values: [[newCellValue]],
      });
    }
  }

  // Execute batch update
  if (batchData.length > 0) {
    const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
    const batchResp = await fetchWithRetry(batchUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData,
      }),
    });
    if (!batchResp.ok) throw new Error('Failed to batch update assignments');
  }

  return { matchedCount, totalUpdates: updates.length };
}

async function checkFreelancerAvailability(accessToken: string, spreadsheetId: string, freelancerName: string, eventDateAD: string) {
  const flRange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:AA1000");
  const flUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${flRange}`;
  const flResp = await fetch(flUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!flResp.ok) return { conflicts: [] };
  const flData = await flResp.json();
  const rows = flData.values || [];

  const nameLower = freelancerName.trim().toLowerCase();
  const dateTrimmed = eventDateAD.trim();
  const conflicts: { clientName: string; event: string; role: string }[] = [];
  const roleNames = ['Photographer Bride', 'Photographer Groom', 'Videographer Bride', 'Videographer Groom', 'Extra Photographer', 'Extra Videographer', 'Assistant', 'iPhone Shooter', 'Drone Operator', 'FPV Operator'];

  for (const row of rows) {
    const dates = (row[7] || '').split('\n');
    const events = (row[3] || '').split('\n');
    const clientName = (row[2] || '').trim();

    for (let dateIdx = 0; dateIdx < dates.length; dateIdx++) {
      if ((dates[dateIdx] || '').trim() !== dateTrimmed) continue;
      // Check columns I-R at this event index
      for (let c = 8; c <= 17; c++) {
        const colValues = (row[c] || '').split('\n');
        if ((colValues[dateIdx] || '').trim().toLowerCase() === nameLower) {
          conflicts.push({
            clientName,
            event: (events[dateIdx] || '').trim(),
            role: roleNames[c - 8] || '',
          });
        }
      }
    }
  }

  return { conflicts };
}

// Get all bookings for a specific freelancer across all clients
async function getFreelancerBookings(accessToken: string, spreadsheetId: string, freelancerName: string) {
  const flRange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:AA1000");
  const flUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${flRange}`;
  const flResp = await fetch(flUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!flResp.ok) throw new Error('Failed to read freelancer assignments');
  const flData = await flResp.json();
  const rows = flData.values || [];

  const nameLower = freelancerName.trim().toLowerCase();
  const roleNames = ['photographerBride', 'photographerGroom', 'videographerBride', 'videographerGroom', 'extraPhotographer', 'extraVideographer', 'assistant', 'iphoneShooter', 'droneOperator', 'fpvOperator'];
  const roleLabels = ['Photographer Bride', 'Photographer Groom', 'Videographer Bride', 'Videographer Groom', 'Extra Photographer', 'Extra Videographer', 'Assistant', 'iPhone Shooter', 'Drone Operator', 'FPV Operator'];

  const bookings: { clientName: string; event: string; eventYear: string; eventMonth: string; eventDay: string; eventDateAD: string; role: string; roleLabel: string; registeredDateTimeAD: string }[] = [];

  for (const row of rows) {
    const registeredDateTimeAD = (row[0] || '').trim();
    const clientName = (row[2] || '').trim();
    const events = (row[3] || '').split('\n');
    const years = (row[4] || '').split('\n');
    const months = (row[5] || '').split('\n');
    const days = (row[6] || '').split('\n');
    const datesAD = (row[7] || '').split('\n');

    const maxIdx = events.length;
    for (let i = 0; i < maxIdx; i++) {
      const eventName = (events[i] || '').trim();
      if (!eventName) continue;

      for (let c = 8; c <= 17; c++) {
        const colValues = (row[c] || '').split('\n');
        if ((colValues[i] || '').trim().toLowerCase() === nameLower) {
          bookings.push({
            clientName,
            event: eventName,
            eventYear: (years[i] || '').trim(),
            eventMonth: (months[i] || '').trim(),
            eventDay: (days[i] || '').trim(),
            eventDateAD: (datesAD[i] || '').trim(),
            role: roleNames[c - 8],
            roleLabel: roleLabels[c - 8],
            registeredDateTimeAD,
          });
        }
      }
    }
  }

  return bookings;
}

// Sync a SINGLE client to BOOKED CLIENTS FREELANCERS sheet (lightweight, called after updateClient)
async function syncSingleClientToFreelancers(accessToken: string, spreadsheetId: string, registeredDateTimeAD: string) {
  // 1. Read the client's event details row
  const eventRange = encodeURIComponent("'BOOKED CLIENTS EVENT DETAILS'!A2:H1000");
  const eventResp = await fetchWithRetry(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${eventRange}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!eventResp.ok) throw new Error('Failed to read event details for freelancer sync');
  const eventData = await eventResp.json();
  const eventRows = (eventData.values || []) as string[][];
  
  const normalizedId = registeredDateTimeAD.trim();
  let evRow = eventRows.find((r: string[]) => (r[0] || '').trim() === normalizedId);
  if (!evRow) {
    console.log(`[syncSingleClientToFreelancers] Client ${normalizedId} not found in EVENT DETAILS, falling back to BOOKED CLIENTS`);
    // Fallback: read directly from BOOKED CLIENTS to bypass Google Sheets propagation delay
    const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:P1000");
    const bookedResp = await fetchWithRetry(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${bookedRange}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (bookedResp.ok) {
      const bookedData = await bookedResp.json();
      const bookedRows = (bookedData.values || []) as string[][];
      const bookedRow = bookedRows.find((r: string[]) => (r[0] || '').trim() === normalizedId);
      if (bookedRow) {
        // Build equivalent evRow from BOOKED CLIENTS columns:
        // A(0)=registeredDateTimeAD, B(1)=dateBS, C(2)=clientName,
        // L(11)=events, M(12)=year, N(13)=month, O(14)=day, P(15)=dateAD
        evRow = [
          bookedRow[0] || '', bookedRow[1] || '', bookedRow[2] || '',
          bookedRow[11] || '', bookedRow[12] || '', bookedRow[13] || '', bookedRow[14] || '', bookedRow[15] || ''
        ];
        console.log(`[syncSingleClientToFreelancers] Found client in BOOKED CLIENTS, built evRow from fallback`);
      }
    }
    if (!evRow) {
      console.log(`[syncSingleClientToFreelancers] Client ${normalizedId} not found in BOOKED CLIENTS either, skipping`);
      return { success: true, skipped: true };
    }
  }

  // 2. Read existing freelancer rows to find if this client exists
  const flRange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:AA1000");
  const flResp = await fetchWithRetry(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${flRange}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  let flRows: string[][] = [];
  if (flResp.ok) {
    const flData = await flResp.json();
    flRows = flData.values || [];
  }

  const existingIdx = flRows.findIndex((r: string[]) => (r[0] || '').trim() === normalizedId);
  const eventCount = (evRow[3] || '').split('\n').filter((n: string) => n.trim()).length;
  const emptyNewlines = Array(eventCount).fill('').join('\n');

  if (existingIdx >= 0) {
    // Update columns A-H (event info)
    const sheetRow = existingIdx + 2;
    const updateRange = encodeURIComponent(`'BOOKED CLIENTS FREELANCERS'!A${sheetRow}:H${sheetRow}`);
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
    await fetchWithRetry(updateUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [[evRow[0] || '', evRow[1] || '', evRow[2] || '', evRow[3] || '', evRow[4] || '', evRow[5] || '', evRow[6] || '', evRow[7] || '']] }),
    });

    // Re-align freelancer columns I-R if event count changed
    const existingRow = flRows[existingIdx];
    const oldEventNames = (existingRow[3] || '').split('\n').filter((n: string) => n.trim());
    const newEventNames = (evRow[3] || '').split('\n').filter((n: string) => n.trim());
    const oldCount = oldEventNames.length;
    const newCount = newEventNames.length;

    if (oldCount !== newCount) {
      // Read current I-R values (columns index 8-17) and AA (index 26)
      const freelancerCols: string[] = [];
      for (let c = 8; c <= 17; c++) {
        freelancerCols.push(existingRow[c] || '');
      }
      // Pad or trim each column to match new event count
      const alignedCols = freelancerCols.map(cellValue => {
        const parts = cellValue.split('\n');
        if (parts.length < newCount) {
          return parts.concat(Array(newCount - parts.length).fill('')).join('\n');
        } else if (parts.length > newCount) {
          return parts.slice(0, newCount).join('\n');
        }
        return cellValue;
      });
      // Write back I-R
      const irRange = encodeURIComponent(`'BOOKED CLIENTS FREELANCERS'!I${sheetRow}:R${sheetRow}`);
      const irUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${irRange}?valueInputOption=USER_ENTERED`;
      await fetchWithRetry(irUrl, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [alignedCols] }),
      });

      // Also re-align Column AA (requiredCategories)
      const aaCellValue = existingRow[26] || '';
      const aaParts = aaCellValue.split('\n');
      let alignedAA = aaCellValue;
      if (aaParts.length < newCount) {
        alignedAA = aaParts.concat(Array(newCount - aaParts.length).fill('')).join('\n');
      } else if (aaParts.length > newCount) {
        alignedAA = aaParts.slice(0, newCount).join('\n');
      }
      const aaRange = encodeURIComponent(`'BOOKED CLIENTS FREELANCERS'!AA${sheetRow}`);
      const aaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${aaRange}?valueInputOption=USER_ENTERED`;
      await fetchWithRetry(aaUrl, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[alignedAA]] }),
      });

      console.log(`[syncSingleClientToFreelancers] Re-aligned freelancer columns + AA: ${oldCount} -> ${newCount} events`);
    }

    console.log(`[syncSingleClientToFreelancers] Updated row ${sheetRow}`);
  } else {
    // Append new row
    const newRow = [
      evRow[0] || '', evRow[1] || '', evRow[2] || '', evRow[3] || '', evRow[4] || '', evRow[5] || '', evRow[6] || '', evRow[7] || '',
      emptyNewlines, emptyNewlines, emptyNewlines, emptyNewlines, emptyNewlines,
      emptyNewlines, emptyNewlines, emptyNewlines, emptyNewlines, emptyNewlines,
      '', '', '', '', '', '', '', '', // S-Z (unused)
      '' // AA (requiredCategories)
    ];
    // Step 1: Find next empty row by reading column A
    const colARange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:A5000");
    const colAUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${colARange}`;
    const colAResp = await fetchWithRetry(colAUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const colAData = await colAResp.json();
    const colARows = colAData.values || [];
    const nextRow = colARows.length + 2; // +2 for header row + 1-indexed

    // Step 2: PUT to exact range to guarantee column A start
    const writeRange = encodeURIComponent(`'BOOKED CLIENTS FREELANCERS'!A${nextRow}:AA${nextRow}`);
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`;
    await fetchWithRetry(writeUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [newRow] }),
    });
    console.log(`[syncSingleClientToFreelancers] Wrote new row at row ${nextRow}`);
  }

  return { success: true };
}

// Bulk sync all booked clients to freelancers sheet (same pattern as fullSyncEventDetails)
async function fullSyncFreelancerAssignments(accessToken: string, spreadsheetId: string) {
  // 1. Read all event details rows (source)
  const eventRange = encodeURIComponent("'BOOKED CLIENTS EVENT DETAILS'!A2:H1000");
  const eventUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${eventRange}`;
  const eventResp = await fetch(eventUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!eventResp.ok) throw new Error('Failed to read event details');
  const eventData = await eventResp.json();
  const eventRows = eventData.values || [];

  // 2. Read all freelancer rows
  const flRange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:AA1000");
  const flUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${flRange}`;
  const flResp = await fetch(flUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  let flRows: string[][] = [];
  if (flResp.ok) {
    const flData = await flResp.json();
    flRows = flData.values || [];
  }

  // Build lookup of existing freelancer rows by registeredDateTimeAD
  const existingMap = new Map<string, number>();
  flRows.forEach((r, idx) => {
    const key = (r[0] || '').trim();
    if (key) existingMap.set(key, idx);
  });

  // Build set of valid booked client IDs from event details
  const validIds = new Set<string>();
  for (const evRow of eventRows) {
    const regId = (evRow[0] || '').trim();
    if (regId) validIds.add(regId);
  }

  let copiedCount = 0;
  let updatedCount = 0;
  const newRows: string[][] = [];

  for (const evRow of eventRows) {
    const regId = (evRow[0] || '').trim();
    if (!regId) continue;

    const eventCount = (evRow[3] || '').split('\n').filter((n: string) => n.trim()).length;
    if (eventCount === 0) continue;

    const emptyNewlines = Array(eventCount).fill('').join('\n');

    if (existingMap.has(regId)) {
      // Update Cols A-H, preserve I-R
      const idx = existingMap.get(regId)!;
      const sheetRow = idx + 2;
      const updateRange = encodeURIComponent(`'BOOKED CLIENTS FREELANCERS'!A${sheetRow}:H${sheetRow}`);
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=USER_ENTERED`;
      await fetch(updateUrl, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [[evRow[0] || '', evRow[1] || '', evRow[2] || '', evRow[3] || '', evRow[4] || '', evRow[5] || '', evRow[6] || '', evRow[7] || '']] }),
      });
      updatedCount++;
    } else {
      // New row
      newRows.push([
        evRow[0] || '', evRow[1] || '', evRow[2] || '', evRow[3] || '', evRow[4] || '', evRow[5] || '', evRow[6] || '', evRow[7] || '',
        emptyNewlines, emptyNewlines, emptyNewlines, emptyNewlines, emptyNewlines,
        emptyNewlines, emptyNewlines, emptyNewlines, emptyNewlines, emptyNewlines,
        '', '', '', '', '', '', '', '', // S-Z (unused)
        '' // AA (requiredCategories)
      ]);
      copiedCount++;
    }
  }

  // Append new rows
  if (newRows.length > 0) {
    // Find next empty row by reading column A
    const colARange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:A5000");
    const colAUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${colARange}`;
    const colAResp = await fetch(colAUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const colAData = await colAResp.json();
    const colARows = colAData.values || [];
    const startRow = colARows.length + 2; // +2 for header + 1-indexed
    const endRow = startRow + newRows.length - 1;

    // PUT all new rows to exact range to guarantee column A start
    const writeRange = encodeURIComponent(`'BOOKED CLIENTS FREELANCERS'!A${startRow}:AA${endRow}`);
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`;
    await fetchWithRetry(writeUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: newRows }),
    });
  }

  // Deduplication pass: remove any duplicate registeredDateTimeAD entries
  let dedupCount = 0;
  const dedupRange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:A1000");
  const dedupResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${dedupRange}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (dedupResp.ok) {
    const dedupData = await dedupResp.json();
    const dedupRows: string[][] = dedupData.values || [];
    const seenIds = new Set<string>();
    const dupeRowNumbers: number[] = [];

    dedupRows.forEach((r: string[], idx: number) => {
      const key = (r[0] || '').trim();
      if (!key) return;
      if (seenIds.has(key)) {
        dupeRowNumbers.push(idx + 2);
      } else {
        seenIds.add(key);
      }
    });

    if (dupeRowNumbers.length > 0) {
      const metaUrl2 = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`;
      const metaResp2 = await fetch(metaUrl2, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (metaResp2.ok) {
        const metaData2 = await metaResp2.json();
        const flSheet2 = metaData2.sheets?.find((s: any) => s.properties?.title === 'BOOKED CLIENTS FREELANCERS');
        if (flSheet2) {
          const sortedDupes = dupeRowNumbers.sort((a, b) => b - a);
          const dedupRequests = sortedDupes.map(rowNum => ({
            deleteDimension: {
              range: { sheetId: flSheet2.properties.sheetId, dimension: 'ROWS', startIndex: rowNum - 1, endIndex: rowNum }
            }
          }));
          await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests: dedupRequests }),
          });
          dedupCount = dupeRowNumbers.length;
          console.log(`[fullSyncFreelancerAssignments] Removed ${dedupCount} duplicate rows`);
        }
      }
    }
  }

  // Cleanup: remove rows from FREELANCERS sheet that are NOT in EVENT DETAILS (e.g., BOOKED SOMEWHERE ELSE)
  let removedCount = 0;

  // Re-read FREELANCERS column A after dedup to get current state
  const cleanupFlRange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:A1000");
  const cleanupFlResp = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${cleanupFlRange}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (cleanupFlResp.ok) {
    const cleanupFlData = await cleanupFlResp.json();
    const currentFlRows: string[][] = cleanupFlData.values || [];
    const rowsToDelete: number[] = [];

    currentFlRows.forEach((r: string[], idx: number) => {
      const key = (r[0] || '').trim();
      if (key && !validIds.has(key)) {
        rowsToDelete.push(idx + 2);
      }
    });

    if (rowsToDelete.length > 0) {
      const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`;
      const metaResp = await fetch(metaUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (metaResp.ok) {
        const metaData = await metaResp.json();
        const flSheet = metaData.sheets?.find((s: any) => s.properties?.title === 'BOOKED CLIENTS FREELANCERS');
        if (flSheet) {
          const sheetId = flSheet.properties.sheetId;
          const sortedRows = rowsToDelete.sort((a, b) => b - a);
          const requests = sortedRows.map(rowNum => ({
            deleteDimension: {
              range: { sheetId, dimension: 'ROWS', startIndex: rowNum - 1, endIndex: rowNum }
            }
          }));
          await fetchWithRetry(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ requests }),
          });
          removedCount = rowsToDelete.length;
          console.log(`[fullSyncFreelancerAssignments] Removed ${removedCount} stale rows (not in EVENT DETAILS)`);
        }
      }
    }
  }

  return { copiedCount, updatedCount, removedCount, dedupCount, totalFreelancers: flRows.length + newRows.length - removedCount - dedupCount };
}
// ============= UPDATE REQUIRED CREW CATEGORIES (COLUMN AA) =============
async function updateRequiredCrewCategories(
  accessToken: string,
  spreadsheetId: string,
  registeredDateTimeAD: string,
  eventName: string,
  eventDateAD: string,
  categories: string
) {
  // Find the client's row
  const flRange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:AA1000");
  const flUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${flRange}`;
  const flResp = await fetchWithRetry(flUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!flResp.ok) throw new Error('Failed to read freelancer assignments');
  const flData = await flResp.json();
  let rows = flData.values || [];

  let clientRowIdx = rows.findIndex((r: string[]) => (r[0] || '').trim() === registeredDateTimeAD.trim());
  
  // Auto-sync if client row is missing
  if (clientRowIdx === -1) {
    console.log(`[updateRequiredCrewCategories] Client not found, auto-syncing to freelancers sheet...`);
    await syncSingleClientToFreelancers(accessToken, spreadsheetId, registeredDateTimeAD);
    // Re-read after sync
    const flResp2 = await fetchWithRetry(flUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (flResp2.ok) {
      const flData2 = await flResp2.json();
      rows = flData2.values || [];
      clientRowIdx = rows.findIndex((r: string[]) => (r[0] || '').trim() === registeredDateTimeAD.trim());
    }
    if (clientRowIdx === -1) throw new Error('Client row not found in freelancers sheet even after sync');
  }

  const row = rows[clientRowIdx];

  // Determine event index by matching event name + date
  const eventNames = (row[3] || '').split('\n');
  const eventDatesInRow = (row[7] || '').split('\n');

  let eventIdx = -1;
  for (let i = 0; i < eventNames.length; i++) {
    if ((eventNames[i] || '').trim().toLowerCase() === eventName.trim().toLowerCase() &&
        (eventDatesInRow[i] || '').trim() === eventDateAD.trim()) {
      eventIdx = i;
      break;
    }
  }
  // Fallback: match by event name only
  if (eventIdx === -1) {
    for (let i = 0; i < eventNames.length; i++) {
      if ((eventNames[i] || '').trim().toLowerCase() === eventName.trim().toLowerCase()) {
        eventIdx = i;
        break;
      }
    }
  }
  if (eventIdx === -1) throw new Error('Event not found in client row');

  // Read current AA value, update at event index, write back
  const currentValues = (row[26] || '').split('\n');
  while (currentValues.length <= eventIdx) currentValues.push('');
  currentValues[eventIdx] = categories;
  const newCellValue = currentValues.join('\n');

  const sheetRow = clientRowIdx + 2;
  const cellRange = encodeURIComponent(`'BOOKED CLIENTS FREELANCERS'!AA${sheetRow}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${cellRange}?valueInputOption=USER_ENTERED`;

  const resp = await fetchWithRetry(updateUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [[newCellValue]] }),
  });

  if (!resp.ok) throw new Error('Failed to update required crew categories');
  console.log(`[updateRequiredCrewCategories] Updated AA for row ${sheetRow}, event ${eventIdx}: ${categories}`);
  return { success: true };
}

// ============= STORAGE DEVICES & FILES SYNC =============

async function pullStorageDevicesFromSheet(accessToken: string) {
  const storageSpreadsheetId = Deno.env.get('WTN_STORAGE_SPREADSHEET_ID')?.trim();
  if (!storageSpreadsheetId) throw new Error('WTN_STORAGE_SPREADSHEET_ID not configured');
  
  // First, get all sheet names for debugging
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${storageSpreadsheetId}?fields=sheets.properties.title`;
  const metaRes = await fetchWithRetry(metaUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (metaRes.ok) {
    const metaData = await metaRes.json();
    const sheetNames = metaData.sheets?.map((s: any) => s.properties?.title) || [];
    console.log(`[pullStorageDevices] Available sheets: ${JSON.stringify(sheetNames)}`);
  } else {
    console.warn(`[pullStorageDevices] Could not fetch sheet metadata: ${metaRes.status}`);
  }


  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, supabaseKey);

  const sheetConfigs = [
    { sheetName: 'HARD DRIVE', deviceType: 'HARD_DRIVE', hasDriveLetter: false },
    { sheetName: 'SSD', deviceType: 'SSD', hasDriveLetter: false },
    { sheetName: 'PC', deviceType: 'PC', hasDriveLetter: true },
  ];

  // Column mapping for HARD DRIVE / SSD (A-I, 9 cols):
  // A: device_name, B: total_storage_gb, C: used/remaining, D: health_percent,
  // E: safety_status, F: speed_rating, G: purchase_date_ad, H: price_npr, I: purchased_from
  //
  // Column mapping for PC (A-J, 10 cols):
  // A: pc_name, B: drive_name, C: total_storage_gb, D: used/remaining,
  // E: health_percent, F: safety_status, G: speed_rating, H: purchase_date_ad, I: price_npr, J: purchased_from

  let totalUpserted = 0;

  for (const config of sheetConfigs) {
    const rangeCols = config.hasDriveLetter ? 'J' : 'I';
    const rangeStr = `'${config.sheetName}'!A2:${rangeCols}500`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${storageSpreadsheetId}/values/${encodeURIComponent(rangeStr)}`;
    
    const response = await fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.warn(`[pullStorageDevices] Failed to read sheet ${config.sheetName}: ${response.status} - ${errBody.substring(0, 300)}`);
      continue;
    }

    const data = await response.json();
    console.log(`[pullStorageDevices] Sheet ${config.sheetName}: ${data.values?.length || 0} rows found`);
    if (!data.values || data.values.length === 0) continue;

    const devices = data.values
      .filter((row: string[]) => row[0]?.trim())
      .map((row: string[]) => {
        if (config.hasDriveLetter) {
          // PC: A=name, B=drive_letter, C=total, D=used_remaining, E=health, F=safety, G=speed, H=date, I=price, J=from
          return {
            device_name: (row[0] || '').trim(),
            device_type: config.deviceType,
            pc_drive_letter: (row[1] || '').trim() || null,
            total_storage_gb: parseFloat(row[2]) || 0,
            remaining_storage_gb: parseFloat(row[3]) || 0,
            health_percent: parseInt(row[4]) || 100,
            safety_status: (row[5] || 'SAFE').trim().toUpperCase(),
            speed_rating: parseInt(row[6]) || 3,
            purchase_date_ad: (row[7] || '').trim(),
            price_npr: parseFloat(row[8]) || 0,
            purchased_from: (row[9] || '').trim(),
            synced_to_sheet: true,
          };
        } else {
          // HARD DRIVE / SSD: A=name, B=total, C=used_remaining, D=health, E=safety, F=speed, G=date, H=price, I=from
          return {
            device_name: (row[0] || '').trim(),
            device_type: config.deviceType,
            pc_drive_letter: null,
            total_storage_gb: parseFloat(row[1]) || 0,
            remaining_storage_gb: parseFloat(row[2]) || 0,
            health_percent: parseInt(row[3]) || 100,
            safety_status: (row[4] || 'SAFE').trim().toUpperCase(),
            speed_rating: parseInt(row[5]) || 3,
            purchase_date_ad: (row[6] || '').trim(),
            price_npr: parseFloat(row[7]) || 0,
            purchased_from: (row[8] || '').trim(),
            synced_to_sheet: true,
          };
        }
      });

    if (devices.length === 0) continue;

    // Upsert by device_name + device_type using a loop (no unique constraint)
    for (const device of devices) {
      const { data: existing } = await sb
        .from('storage_devices')
        .select('id')
        .eq('device_name', device.device_name)
        .eq('device_type', device.device_type)
        .maybeSingle();

      if (existing) {
        await sb.from('storage_devices').update(device).eq('id', existing.id);
      } else {
        await sb.from('storage_devices').insert(device);
      }
      totalUpserted++;
    }
  }

  return { upserted: totalUpserted };
}

async function pushFilesToSheetAction(accessToken: string, fullClean = false) {
  const storageSpreadsheetId = Deno.env.get('WTN_STORAGE_SPREADSHEET_ID');
  if (!storageSpreadsheetId) throw new Error('WTN_STORAGE_SPREADSHEET_ID not configured');

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, supabaseKey);

  // Helper: format ISO timestamps to readable dates like "Mar 4, 2026 2:30 PM"
  const formatTs = (ts: string | null): string => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
      const day = d.getDate();
      const year = d.getFullYear();
      let hours = d.getHours();
      const mins = d.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${month} ${day}, ${year} ${hours}:${mins} ${ampm}`;
    } catch { return ts; }
  };

  // Always only push files that have at least first backup
  let query = sb
    .from('files_management')
    .select('*')
    .eq('synced_to_sheet', false)
    .neq('final_generated_path', '')
    .not('final_generated_path', 'is', null);

  let { data: unsyncedFiles, error } = await query;

  if (error) throw error;
  // Don't return early — even with 0 unsynced, we may need to bootstrap if sheet is empty
  if (!unsyncedFiles) unsyncedFiles = [];

  const sheetTitle = 'BOOKED CLIENTS WTN FILES';
  const HEADER_ROW = [
    'ID',
    'REGISTERED DATE & TIME (AD)', 'REGISTERED DATE BS', 'CLIENT NAME', 'EVENT',
    'EVENT YEAR', 'EVENT MONTH', 'EVENT DAY', 'EVENT DATE IN AD',
    'FREELANCER TYPE', 'FREELANCER NAME', 'CARDS', 'FILE PATH',
    'SIZE IN GB', 'NO OF ITEMS', 'FORMAT', 'WHO COPIED FIRST?',
    'RECONFIRMATION', 'DOUBLE BACKUP PATH', 'TRIPLE BACKUP PATH', 'CLOUD NAME',
    'DRIVE LINK', 'DELETED OR NOT', 'NOTES', 'BACKUP HISTORY',
  ];

  // Helper: map a DB row to the 25-column sheet row (ID first)
  const mapRow = (f: any) => [
    f.id || '',
    formatTs(f.registered_date_time_ad),
    f.registered_date_bs || '',
    f.client_name || '',
    f.event_name || '',
    f.event_year || '',
    f.event_month || '',
    f.event_day || '',
    f.event_date_ad || '',
    f.freelancer_type || '',
    f.freelancer_name || '',
    f.card_label || '',
    f.final_generated_path || '',
    f.size_gb?.toString() || '0',
    f.number_of_items?.toString() || '0',
    f.format_type || '',
    f.who_copied || '',
    f.confirmed ? 'CONFIRMED' : 'NOT CONFIRMED',
    f.backup_2_path || '',
    f.backup_3_path || '',
    f.drive_upload_path || '',
    f.drive_link || '',
    f.deleted_or_not ? 'TRUE' : 'FALSE',
    f.notes || '',
    f.backup_history || '',
  ];

  // Helper: use DB UUID (Column A) as the unique key for exact matching
  const makeKey = (row: string[]) => (row[0] || '').trim();

  // Ensure tab exists
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${storageSpreadsheetId}?fields=sheets.properties.title`;
  const metaRes = await fetchWithRetry(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const metaData = await metaRes.json();
  const tabExists = (metaData.sheets || []).some((s: any) => s.properties?.title === sheetTitle);

  if (!tabExists) {
    console.log('Creating BOOKED CLIENTS WTN FILES tab...');
    const addSheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${storageSpreadsheetId}:batchUpdate`;
    const addRes = await fetchWithRetry(addSheetUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: sheetTitle } } }] }),
    });
    if (!addRes.ok) {
      const errText = await addRes.text();
      throw new Error(`Failed to create tab: ${addRes.status} - ${errText.substring(0, 200)}`);
    }
    // Write header
    const headerRange = encodeURIComponent(`'${sheetTitle}'!A1:Y1`);
    const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${storageSpreadsheetId}/values/${headerRange}?valueInputOption=USER_ENTERED`;
    await fetchWithRetry(headerUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [HEADER_ROW] }),
    });
    console.log('BOOKED CLIENTS WTN FILES tab created with header');
  }

  // ── FULL CLEAN MODE: clear all data, rewrite header, reset synced flags ──
  if (fullClean) {
    console.log('[FILES-PUSH] Full clean mode — clearing sheet and rewriting header');
    // 1. Clear all rows below header
    const clearRange = encodeURIComponent(`'${sheetTitle}'!A2:Y10000`);
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${storageSpreadsheetId}/values/${clearRange}:clear`;
    await fetchWithRetry(clearUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    // 2. Rewrite header row with corrected columns T/U
    const headerRange = encodeURIComponent(`'${sheetTitle}'!A1:Y1`);
    const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${storageSpreadsheetId}/values/${headerRange}?valueInputOption=USER_ENTERED`;
    await fetchWithRetry(headerUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [HEADER_ROW] }),
    });
    // 3. Reset synced_to_sheet for all files with backup
    await sb
      .from('files_management')
      .update({ synced_to_sheet: false })
      .neq('final_generated_path', '')
      .not('final_generated_path', 'is', null);
    // 4. Re-query all unsynced files with backup
    const { data: freshFiles, error: freshErr } = await sb
      .from('files_management')
      .select('*')
      .eq('synced_to_sheet', false)
      .neq('final_generated_path', '')
      .not('final_generated_path', 'is', null);
    if (freshErr) throw freshErr;
    if (!freshFiles || freshFiles.length === 0) return { pushed: 0, fullClean: true };
    unsyncedFiles.length = 0;
    unsyncedFiles.push(...freshFiles);
    console.log(`[FILES-PUSH] Full clean: ${freshFiles.length} rows to push`);
    // Skip dedup — sheet is empty, go straight to append
    const allRows = unsyncedFiles.map((f: any) => mapRow(f));
    // Append in batches of 500
    for (let i = 0; i < allRows.length; i += 500) {
      const batch = allRows.slice(i, i + 500);
      const appendRange = encodeURIComponent(`'${sheetTitle}'!A:Y`);
      const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${storageSpreadsheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      const appendRes = await fetchWithRetry(appendUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: batch }),
      });
      if (!appendRes.ok) {
        const errText = await appendRes.text();
        throw new Error(`Failed to append files: ${appendRes.status} - ${errText.substring(0, 200)}`);
      }
    }
    console.log(`[FILES-PUSH] Full clean: appended ${allRows.length} rows`);
    // Mark all as synced
    const ids = unsyncedFiles.map((f: any) => f.id);
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await sb.from('files_management').update({ synced_to_sheet: true }).in('id', batch);
    }
    return { pushed: allRows.length, fullClean: true };
  }

  // Read existing sheet data for dedup
  const readRange = encodeURIComponent(`'${sheetTitle}'!A:Y`);
  const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${storageSpreadsheetId}/values/${readRange}`;
  const readRes = await fetchWithRetry(readUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const readData = await readRes.json();
  const existingRows: string[][] = readData.values || [];

  // AUTO-BOOTSTRAP: If sheet is empty (only header or nothing), reset synced flag
  if (existingRows.length <= 1) {
    console.log('[FILES-PUSH] Sheet is empty — bootstrapping: resetting synced_to_sheet for rows with backups');
    const { error: resetErr } = await sb
      .from('files_management')
      .update({ synced_to_sheet: false })
      .neq('final_generated_path', '')
      .not('final_generated_path', 'is', null)
      .eq('synced_to_sheet', true);
    if (resetErr) {
      console.error('[FILES-PUSH] Bootstrap reset error:', resetErr);
    } else {
      const { data: freshFiles, error: freshErr } = await sb
        .from('files_management')
        .select('*')
        .eq('synced_to_sheet', false)
        .neq('final_generated_path', '')
        .not('final_generated_path', 'is', null);
      if (freshErr) throw freshErr;
      if (!freshFiles || freshFiles.length === 0) return { pushed: 0, bootstrapped: true };
      unsyncedFiles.length = 0;
      unsyncedFiles.push(...freshFiles);
      console.log(`[FILES-PUSH] Bootstrap found ${freshFiles.length} rows to push`);
    }
  }

  // Build key → sheet row number (1-indexed, skip header)
  const keyToSheetRow = new Map<string, number>();
  for (let i = 1; i < existingRows.length; i++) {
    const key = makeKey(existingRows[i]);
    keyToSheetRow.set(key, i + 1); // 1-indexed sheet row
  }

  // After bootstrap, if still no files to push, return early
  if (unsyncedFiles.length === 0) return { pushed: 0 };

  // Split into updates vs appends
  const updateBatch: { range: string; values: string[][] }[] = [];
  const appendRows: string[][] = [];

  for (const f of unsyncedFiles) {
    const row = mapRow(f);
    const key = makeKey(row);
    const existingSheetRow = keyToSheetRow.get(key);

    if (existingSheetRow) {
      // Update in-place
      const range = `'${sheetTitle}'!A${existingSheetRow}:Y${existingSheetRow}`;
      updateBatch.push({ range, values: [row] });
    } else {
      appendRows.push(row);
    }
  }

  // Batch update existing rows
  if (updateBatch.length > 0) {
    // Process in chunks of 100 to stay within API limits
    for (let i = 0; i < updateBatch.length; i += 100) {
      const chunk = updateBatch.slice(i, i + 100);
      const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${storageSpreadsheetId}/values:batchUpdate`;
      const batchRes = await fetchWithRetry(batchUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: chunk,
        }),
      });
      if (!batchRes.ok) {
        const errText = await batchRes.text();
        throw new Error(`Failed to batch update files: ${batchRes.status} - ${errText.substring(0, 200)}`);
      }
    }
    console.log(`Updated ${updateBatch.length} existing rows in sheet`);
  }

  // Append new rows
  if (appendRows.length > 0) {
    const appendRange = encodeURIComponent(`'${sheetTitle}'!A:Y`);
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${storageSpreadsheetId}/values/${appendRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const appendRes = await fetchWithRetry(appendUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: appendRows }),
    });
    if (!appendRes.ok) {
      const errText = await appendRes.text();
      throw new Error(`Failed to append files: ${appendRes.status} - ${errText.substring(0, 200)}`);
    }
    console.log(`Appended ${appendRows.length} new rows to sheet`);
  }

  // Mark all as synced
  const ids = unsyncedFiles.map((f: any) => f.id);
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    await sb.from('files_management').update({ synced_to_sheet: true }).in('id', batch);
  }

  return { pushed: unsyncedFiles.length, updated: updateBatch.length, appended: appendRows.length };
}

async function pushStorageDevicesToSheetAction(accessToken: string) {
  const storageSpreadsheetId = Deno.env.get('WTN_STORAGE_SPREADSHEET_ID')?.trim();
  if (!storageSpreadsheetId) throw new Error('WTN_STORAGE_SPREADSHEET_ID not configured');

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(supabaseUrl, supabaseKey);

  // Fetch all storage devices
  const { data: allDevices, error } = await sb
    .from('storage_devices')
    .select('*')
    .order('device_name', { ascending: true });
  if (error) throw error;

  const sheetConfigs = [
    { sheetName: 'HARD DRIVE', deviceType: 'HARD_DRIVE', hasDriveLetter: false },
    { sheetName: 'SSD', deviceType: 'SSD', hasDriveLetter: false },
    { sheetName: 'PC', deviceType: 'PC', hasDriveLetter: true },
    { sheetName: 'CLOUD', deviceType: 'CLOUD', hasDriveLetter: false },
  ];

  let totalPushed = 0;

  for (const config of sheetConfigs) {
    const devices = (allDevices || []).filter((d: any) => d.device_type === config.deviceType);

    // Clear existing data from row 2 onwards
    const rangeCols = config.deviceType === 'CLOUD' ? 'F' : (config.hasDriveLetter ? 'K' : 'J');
    const clearRange = encodeURIComponent(`'${config.sheetName}'!A2:${rangeCols}500`);
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${storageSpreadsheetId}/values/${clearRange}:clear`;
    await fetchWithRetry(clearUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (devices.length === 0) continue;

    // Build rows matching sheet layout
    const values = devices.map((d: any) => {
      if (config.deviceType === 'CLOUD') {
        // CLOUD: A=Cloud Type, B=Cloud Name, C=Total Storage, D=Used, E=Remaining, F=Expiry Date AD
        return [
          d.cloud_type || '',
          d.device_name || '',
          d.total_storage_gb?.toString() || '0',
          d.used_storage_gb?.toString() || '0',
          d.remaining_storage_gb?.toString() || '0',
          d.expiry_date_ad || '',
        ];
      } else if (config.hasDriveLetter) {
        // PC: A=PC Name, B=Drive Name, C=Total Storage, D=Used, E=Remaining, F=Health, G=Safety, H=Speed, I=Purchase Date AD, J=Price, K=Purchased From
        return [
          d.device_name || '',
          d.pc_drive_letter || '',
          d.total_storage_gb?.toString() || '0',
          d.used_storage_gb?.toString() || '0',
          d.remaining_storage_gb?.toString() || '0',
          d.health_percent?.toString() || '100',
          d.safety_status || 'SAFE',
          d.speed_rating?.toString() || '3',
          d.purchase_date_ad || '',
          d.price_npr?.toString() || '0',
          d.purchased_from || '',
        ];
      } else {
        // HARD DRIVE / SSD: A=Name, B=Total Storage, C=Used, D=Remaining, E=Health, F=Safety, G=Speed, H=Purchase Date AD, I=Price, J=Purchased From
        return [
          d.device_name || '',
          d.total_storage_gb?.toString() || '0',
          d.used_storage_gb?.toString() || '0',
          d.remaining_storage_gb?.toString() || '0',
          d.health_percent?.toString() || '100',
          d.safety_status || 'SAFE',
          d.speed_rating?.toString() || '3',
          d.purchase_date_ad || '',
          d.price_npr?.toString() || '0',
          d.purchased_from || '',
        ];
      }
    });

    // Write to sheet
    const writeRange = encodeURIComponent(`'${config.sheetName}'!A2:${rangeCols}${1 + values.length}`);
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${storageSpreadsheetId}/values/${writeRange}?valueInputOption=USER_ENTERED`;
    const writeRes = await fetchWithRetry(writeUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    });

    if (!writeRes.ok) {
      const errText = await writeRes.text();
      console.error(`[pushStorageDevices] Failed to write ${config.sheetName}: ${errText.substring(0, 200)}`);
      continue;
    }

    totalPushed += devices.length;
    console.log(`[pushStorageDevices] Wrote ${devices.length} devices to ${config.sheetName}`);
  }

  // Mark all devices as synced
  if (totalPushed > 0) {
    const ids = (allDevices || []).map((d: any) => d.id);
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);
      await sb.from('storage_devices').update({ synced_to_sheet: true }).in('id', batch);
    }
  }

  return { pushed: totalPushed };
}

// ============= VIDEO EDIT TRACKER FUNCTIONS =============

const VIDEO_EDIT_SHEET = 'BOOKED CLIENTS VIDEO EDIT TRACKER';

interface VideoEditRowData {
  rowNumber: number;
  registeredDateTimeAD: string;
  registeredDateBS: string;
  clientName: string;
  eventName: string;
  eventYear: string;
  eventMonth: string;
  eventDay: string;
  eventDateAD: string;
  videoEditStatus: string;
  urgency: string;
  priority: string;
  subEventName: string;
  editType: string;
  editor: string;
  companyNotes: string;
  clientDemand: string;
  reference: string;
  songs: string;
}

async function ensureVideoEditSheetExists(accessToken: string, spreadsheetId: string): Promise<void> {
  // Check if the tab exists
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const metaResp = await fetchWithRetry(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meta = await metaResp.json();
  const sheets = (meta.sheets || []).map((s: any) => s.properties?.title);
  
  if (sheets.includes(VIDEO_EDIT_SHEET)) return;

  console.log(`[VIDEO EDIT] Sheet tab "${VIDEO_EDIT_SHEET}" not found, creating...`);
  
  // Create the sheet tab
  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  await fetchWithRetry(batchUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title: VIDEO_EDIT_SHEET } } }],
    }),
  });

  // Add header row
  const headerRange = `'${VIDEO_EDIT_SHEET}'!A1:R1`;
  const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(headerRange)}?valueInputOption=RAW`;
  await fetchWithRetry(headerUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      values: [['REGISTERED DATE TIME AD', 'REGISTERED DATE BS', 'CLIENT NAME', 'EVENT NAME', 'EVENT YEAR', 'EVENT MONTH', 'EVENT DAY', 'EVENT DATE AD', 'VIDEO EDIT STATUS', 'URGENCY', 'PRIORITY', 'SUB EVENT NAME', 'EDIT TYPE', 'EDITOR', 'COMPANY NOTES', 'CLIENT DEMAND', 'REFERENCE', 'SONGS']],
    }),
  });
  console.log(`[VIDEO EDIT] Sheet tab created with headers`);
}

async function getVideoEditRows(accessToken: string, spreadsheetId: string): Promise<VideoEditRowData[]> {
  await ensureVideoEditSheetExists(accessToken, spreadsheetId);
  const range = `'${VIDEO_EDIT_SHEET}'!A2:R1000`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const response = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) {
    const errBody = await response.text();
    console.error(`[VIDEO EDIT] getVideoEditRows failed: ${response.status} ${errBody}`);
    return [];
  }
  
  const result = await response.json();
  const values: string[][] = result.values || [];

  return values
    .map((row: string[], idx: number) => ({
      rowNumber: idx + 2,
      registeredDateTimeAD: row[0] || '',
      registeredDateBS: row[1] || '',
      clientName: row[2] || '',
      eventName: row[3] || '',
      eventYear: row[4] || '',
      eventMonth: row[5] || '',
      eventDay: row[6] || '',
      eventDateAD: row[7] || '',
      videoEditStatus: row[8] || 'QUEUE',
      urgency: row[9] || '',
      priority: row[10] || '',
      subEventName: row[11] || '',
      editType: row[12] || '',
      editor: row[13] || '',
      companyNotes: row[14] || '',
      clientDemand: row[15] || '',
      reference: row[16] || '',
      songs: row[17] || '',
    }))
    .filter((r: VideoEditRowData) => r.registeredDateTimeAD);
}

async function updateVideoEditRow(
  accessToken: string,
  spreadsheetId: string,
  rowNumber: number,
  updates: Record<string, string>
): Promise<{ success: boolean }> {
  // Map field names to column letters
  const fieldToCol: Record<string, string> = {
    videoEditStatus: 'I', urgency: 'J', priority: 'K',
    subEventName: 'L', editType: 'M', editor: 'N',
    companyNotes: 'O', clientDemand: 'P', reference: 'Q', songs: 'R',
  };

  for (const [field, value] of Object.entries(updates)) {
    const col = fieldToCol[field];
    if (!col) continue;
    const range = `'${VIDEO_EDIT_SHEET}'!${col}${rowNumber}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=RAW`;
    await fetchWithRetry(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [[value]] }),
    });
  }
  return { success: true };
}

async function pushVideoEditToLab(
  accessToken: string,
  spreadsheetId: string,
  rowNumber: number
): Promise<{ success: boolean }> {
  return updateVideoEditRow(accessToken, spreadsheetId, rowNumber, { videoEditStatus: 'LAB' });
}

async function generateVideoEditRows(
  accessToken: string,
  spreadsheetId: string
): Promise<{ success: boolean; generatedCount: number }> {
  // 1. Get existing rows to avoid duplicates
  const existing = await getVideoEditRows(accessToken, spreadsheetId);
  const existingKeys = new Set(
    existing.map((r: VideoEditRowData) => `${r.registeredDateTimeAD}||${r.eventName}||${r.subEventName}||${r.editType}`)
  );

  const sbUrl = Deno.env.get('SUPABASE_URL')!;
  const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const headers = { apikey: sbKey, Authorization: `Bearer ${sbKey}` };

  // 2. Load ALL booked clients
  const clientsResp = await fetch(
    `${sbUrl}/rest/v1/clients_cache?sheet_source=eq.booked&select=registered_date_time_ad,registered_date_bs,client_name,events,event_year,event_month,event_day,event_date_ad`,
    { headers }
  );
  const clients = await clientsResp.json();
  const clientMap: Record<string, any> = {};
  for (const c of clients) {
    if (c.registered_date_time_ad) clientMap[c.registered_date_time_ad] = c;
  }
  console.log(`[VIDEO EDIT] Found ${clients.length} booked clients`);

  // 3. Load ALL event details (the primary source for per-event rows)
  const eventsResp = await fetch(
    `${sbUrl}/rest/v1/event_details_cache?select=registered_date_time_ad,event_name,event_year,event_month,event_day,event_date_ad,event_index`,
    { headers }
  );
  const allEvents = await eventsResp.json();
  console.log(`[VIDEO EDIT] Found ${allEvents.length} total event detail rows`);

  // 4. Load video deliverables for enrichment (optional overlay)
  const delResp = await fetch(
    `${sbUrl}/rest/v1/client_deliverables?section=eq.videos&enabled=eq.true&select=*`,
    { headers }
  );
  const deliverables = await delResp.json();

  // Build deliverables lookup: key = "regId||eventName||type"
  const delMap: Record<string, any[]> = {};
  for (const del of deliverables) {
    const k = `${del.registered_date_time_ad}||${del.event_name}`;
    if (!delMap[k]) delMap[k] = [];
    delMap[k].push(del);
  }

  const EDIT_TYPE_LABELS: Record<string, string> = {
    full_video: 'Full Video',
    highlights: 'Highlights',
    reel: 'Reel',
    video_insta_post: 'Insta Post',
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const newRows: string[][] = [];

  // 5. Iterate ALL events, filter to past events with a booked client
  for (const evt of allEvents) {
    const client = clientMap[evt.registered_date_time_ad];
    if (!client) continue; // not a booked client

    const eventDateAD = evt.event_date_ad || '';
    // Skip future events, empty dates, and unknown "**" dates
    if (!eventDateAD || eventDateAD.includes('**') || eventDateAD >= todayStr) continue;

    const eventName = evt.event_name || '';
    if (!eventName) continue;

    const baseInfo = {
      regId: evt.registered_date_time_ad,
      regBS: client.registered_date_bs || '',
      clientName: client.client_name || '',
      eventName,
      eventYear: evt.event_year || '',
      eventMonth: evt.event_month || '',
      eventDay: evt.event_day || '',
      eventDateAD,
    };

    // Check if this client+event has specific video deliverables
    const delKey = `${evt.registered_date_time_ad}||${eventName}`;
    const eventDeliverables = delMap[delKey];

    if (eventDeliverables && eventDeliverables.length > 0) {
      // Use configured deliverables (with quantities/item names)
      for (const del of eventDeliverables) {
        const editTypeLabel = EDIT_TYPE_LABELS[del.deliverable_type] || del.deliverable_type;
        const quantity = del.quantity || 1;
        let itemNames: string[] = [];
        try { itemNames = (del.item_names || '').split('|||').map((s: string) => s.trim()).filter(Boolean); } catch { itemNames = []; }

        for (let i = 0; i < quantity; i++) {
          const subEventName = itemNames[i] || `${eventName} - ${editTypeLabel} ${quantity > 1 ? i + 1 : ''}`.trim();
          const uniqueKey = `${baseInfo.regId}||${eventName}||${subEventName}||${editTypeLabel}`;
          if (existingKeys.has(uniqueKey)) continue;
          existingKeys.add(uniqueKey);

          newRows.push([
            baseInfo.regId, baseInfo.regBS, baseInfo.clientName, baseInfo.eventName,
            baseInfo.eventYear, baseInfo.eventMonth, baseInfo.eventDay, baseInfo.eventDateAD,
            'QUEUE', '', '', subEventName, editTypeLabel, '', '', '', '', '',
          ]);
        }
      }
    } else {
      // Default: generate Full Video + Highlights for this event
      for (const editType of ['Full Video', 'Highlights']) {
        const subEventName = `${eventName} - ${editType}`;
        const uniqueKey = `${baseInfo.regId}||${eventName}||${subEventName}||${editType}`;
        if (existingKeys.has(uniqueKey)) continue;
        existingKeys.add(uniqueKey);

        newRows.push([
          baseInfo.regId, baseInfo.regBS, baseInfo.clientName, baseInfo.eventName,
          baseInfo.eventYear, baseInfo.eventMonth, baseInfo.eventDay, baseInfo.eventDateAD,
          'QUEUE', '', '', subEventName, editType, '', '', '', '', '',
        ]);
      }
    }
  }

  // 6. Append to sheet
  if (newRows.length > 0) {
    await ensureVideoEditSheetExists(accessToken, spreadsheetId);
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(`'${VIDEO_EDIT_SHEET}'!A:R`)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
    const appendResp = await fetchWithRetry(appendUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: newRows }),
    });
    if (!appendResp.ok) {
      const errBody = await appendResp.text();
      console.error(`[VIDEO EDIT] Append failed: ${appendResp.status} ${errBody}`);
      throw new Error(`Sheet append failed: ${appendResp.status}`);
    }
    const appendResult = await appendResp.json();
    console.log(`[VIDEO EDIT] Append response: ${JSON.stringify(appendResult.updates || {})}`);
  }

  console.log(`[VIDEO EDIT] Generated ${newRows.length} new rows from ${allEvents.length} event records`);
  return { success: true, generatedCount: newRows.length };
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
      case 'getAllClients':
        // Returns unified data from both CLIENT TRACKER and BOOKED CLIENTS
        result = await getAllClientsFromBothSheets(accessToken, spreadsheetId, body.limit);
        break;
      case 'getSingleClient':
        // Returns a single client from either CLIENT TRACKER or BOOKED CLIENTS
        if (!data || !data.registeredDateTimeAD) throw new Error('registeredDateTimeAD is required for getSingleClient');
        result = await getSingleClient(accessToken, spreadsheetId, data.registeredDateTimeAD as string);
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
      case 'addBookedClientComment':
        if (!data || !data.bookedRowNumber || !data.comment) throw new Error('bookedRowNumber and comment are required for addBookedClientComment');
        result = await addBookedClientComment(
          accessToken, 
          spreadsheetId, 
          data.bookedRowNumber as number, 
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
      case 'cleanupDuplicateBookedFromTracker':
        result = await cleanupDuplicateBookedFromTracker(accessToken, spreadsheetId);
        break;
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
      case 'getBulkEventDetails':
        if (!data || !data.clientIds || !Array.isArray(data.clientIds)) {
          throw new Error('clientIds array is required for getBulkEventDetails');
        }
        result = await getBulkEventDetails(accessToken, spreadsheetId, data.clientIds as string[]);
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
      case 'getEventDetailsSetupData':
        result = await getEventDetailsSetupData(accessToken, spreadsheetId);
        break;
      case 'getVenuesByType':
        if (!data || !data.venueType) throw new Error('venueType is required for getVenuesByType');
        result = await getVenuesByType(accessToken, spreadsheetId, data.venueType as string);
        break;
      case 'addVenueEntry':
        if (!data || !data.venueType || !data.name) throw new Error('venueType and name are required for addVenueEntry');
        result = await addVenueEntry(accessToken, spreadsheetId, data.venueType as string, {
          name: data.name as string,
          city: (data.city as string) || '',
          area: (data.area as string) || '',
          googleMap: (data.googleMap as string) || '',
        });
        break;
      case 'getParlourTypes':
        result = await getParlourTypes(accessToken, spreadsheetId);
        break;
      case 'getParloursByType':
        if (!data || !data.parlourType) throw new Error('parlourType is required for getParloursByType');
        result = await getParloursByType(accessToken, spreadsheetId, data.parlourType as string);
        break;
      case 'addParlourEntry':
        if (!data || !data.parlourType || !data.name) throw new Error('parlourType and name are required for addParlourEntry');
        result = await addParlourEntry(accessToken, spreadsheetId, data.parlourType as string, {
          name: data.name as string,
          city: (data.city as string) || '',
          area: (data.area as string) || '',
          googleMap: (data.googleMap as string) || '',
        });
        break;
      case 'refreshClientVendorData':
        if (!data || !data.registeredDateTimeAD) throw new Error('registeredDateTimeAD is required for refreshClientVendorData');
        result = await refreshClientVendorData(accessToken, spreadsheetId, data.registeredDateTimeAD as string);
        break;
      case 'getClientContactDetails':
        if (!data || !data.registeredDateTimeAD) throw new Error('registeredDateTimeAD is required for getClientContactDetails');
        result = await getClientContactDetails(accessToken, spreadsheetId, data.registeredDateTimeAD as string);
        break;
      case 'updateClientContactDetails':
        if (!data || !data.registeredDateTimeAD) throw new Error('registeredDateTimeAD is required for updateClientContactDetails');
        result = await updateClientContactDetails(
          accessToken,
          spreadsheetId,
          data.registeredDateTimeAD as string,
          data.updates as Record<string, string> || {}
        );
        break;
      case 'fullSyncContactDetails':
        result = await fullSyncContactDetails(accessToken, spreadsheetId);
        break;
      case 'resyncClientContactDetails':
        if (!data || !data.registeredDateTimeAD) throw new Error('registeredDateTimeAD is required for resyncClientContactDetails');
        result = await resyncClientContactDetails(accessToken, spreadsheetId, data.registeredDateTimeAD as string);
        break;
      case 'getPublicFormData':
        result = await getPublicFormData(accessToken, spreadsheetId);
        break;
      case 'updateClientPriority':
        if (!data) throw new Error('data is required for updateClientPriority');
        result = await updateClientPriority(
          accessToken,
          spreadsheetId,
          data.rowNumber as number,
          data.priority as string,
          data.registeredDateTimeAD as string | undefined
        );
        break;
      case 'updateBenzoKeepNotes':
        if (!data) throw new Error('data is required for updateBenzoKeepNotes');
        result = await updateBenzoKeepNotes(
          accessToken,
          spreadsheetId,
          data.rowNumber as number,
          data.notesData as string || '',
          data.registeredDateTimeAD as string | undefined
        );
        break;
      case 'getSearchHistory':
        result = await getSearchHistory(accessToken, spreadsheetId);
        break;
      case 'saveSearchQuery':
        if (!data || !data.query) throw new Error('query is required for saveSearchQuery');
        result = await saveSearchQuery(accessToken, spreadsheetId, data.query as string);
        break;
      case 'getUnassignedBenzoKeepNotes':
        result = await getUnassignedBenzoKeepNotes(accessToken, spreadsheetId);
        break;
      case 'saveUnassignedBenzoKeepNote':
        if (!data || !data.note) throw new Error('note is required for saveUnassignedBenzoKeepNote');
        result = await saveUnassignedBenzoKeepNote(accessToken, spreadsheetId, data.note as UnassignedBenzoNote);
        break;
      case 'deleteUnassignedBenzoKeepNote':
        if (!data || !data.noteId) throw new Error('noteId is required for deleteUnassignedBenzoKeepNote');
        result = await deleteUnassignedBenzoKeepNote(accessToken, spreadsheetId, data.noteId as string);
        break;
      case 'transferBenzoKeepNote':
        if (!data || !data.noteId || !data.targetClientRegisteredDateTimeAD) {
          throw new Error('noteId and targetClientRegisteredDateTimeAD are required for transferBenzoKeepNote');
        }
        result = await transferBenzoKeepNote(
          accessToken, 
          spreadsheetId, 
          data.noteId as string, 
          data.targetClientRegisteredDateTimeAD as string
        );
        break;
      case 'getClientsForNoteAssignment':
        result = await getClientsForNoteAssignment(accessToken, spreadsheetId);
        break;
      case 'assignBenzoKeepNoteToClient':
        if (!data || !data.registeredDateTimeAD || !data.notesData) {
          throw new Error('registeredDateTimeAD and notesData are required for assignBenzoKeepNoteToClient');
        }
        result = await assignBenzoKeepNoteToClient(
          accessToken, 
          spreadsheetId, 
          data.registeredDateTimeAD as string, 
          data.notesData as string
        );
        break;
      // ============= WTN DAILY TASK ACTIONS =============
      case 'getDailyTasks': {
        const taskSpreadsheetId = Deno.env.get('WTN_DAILY_TASK_SPREADSHEET_ID') || spreadsheetId;
        result = await getDailyTasks(accessToken, taskSpreadsheetId);
        break;
      }
      case 'addDailyTask': {
        if (!data) throw new Error('data is required for addDailyTask');
        const taskSpreadsheetId = Deno.env.get('WTN_DAILY_TASK_SPREADSHEET_ID') || spreadsheetId;
        result = await addDailyTask(accessToken, taskSpreadsheetId, data);
        break;
      }
      case 'updateDailyTask': {
        if (!data || !data.rowNumber) throw new Error('rowNumber and task data are required for updateDailyTask');
        const taskSpreadsheetId = Deno.env.get('WTN_DAILY_TASK_SPREADSHEET_ID') || spreadsheetId;
        result = await updateDailyTask(accessToken, taskSpreadsheetId, data);
        break;
      }
      case 'updateDailyTaskStatus': {
        if (!data || !data.rowNumber || !data.newStatus) throw new Error('rowNumber and newStatus are required for updateDailyTaskStatus');
        const taskSpreadsheetId = Deno.env.get('WTN_DAILY_TASK_SPREADSHEET_ID') || spreadsheetId;
        result = await updateDailyTaskStatus(accessToken, taskSpreadsheetId, data.rowNumber as number, data.newStatus as string);
        break;
      }
      case 'getDailyTaskSetupData': {
        const taskSpreadsheetId = Deno.env.get('WTN_DAILY_TASK_SPREADSHEET_ID') || spreadsheetId;
        result = await getDailyTaskSetupData(accessToken, taskSpreadsheetId);
        break;
      }
      // ============= FREELANCERS MODULE =============
      case 'getFreelancers': {
        const flSpreadsheetId = Deno.env.get('WTN_FREELANCERS_SPREADSHEET_ID') || spreadsheetId;
        result = await getFreelancersData(accessToken, flSpreadsheetId, body.limit);
        break;
      }
      case 'addFreelancer': {
        if (!data) throw new Error('data is required for addFreelancer');
        const flSpreadsheetId = Deno.env.get('WTN_FREELANCERS_SPREADSHEET_ID') || spreadsheetId;
        result = await addFreelancerData(accessToken, flSpreadsheetId, data);
        break;
      }
      case 'updateFreelancer': {
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for updateFreelancer');
        const flSpreadsheetId = Deno.env.get('WTN_FREELANCERS_SPREADSHEET_ID') || spreadsheetId;
        result = await updateFreelancerData(accessToken, flSpreadsheetId, data);
        break;
      }
      case 'deleteFreelancer': {
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for deleteFreelancer');
        const flSpreadsheetId = Deno.env.get('WTN_FREELANCERS_SPREADSHEET_ID') || spreadsheetId;
        result = await deleteFreelancerData(accessToken, flSpreadsheetId, data.rowNumber as number, data.name as string);
        break;
      }
      case 'syncFreelancerCategories': {
        const flSpreadsheetId = Deno.env.get('WTN_FREELANCERS_SPREADSHEET_ID') || spreadsheetId;
        const allFreelancers = await getFreelancersData(accessToken, flSpreadsheetId, 500);
        let mirrored = 0;
        for (const f of allFreelancers) {
          await mirrorToFreelancerCategorySheets(accessToken, flSpreadsheetId, f as unknown as Record<string, unknown>);
          mirrored++;
        }
        console.log(`[FREELANCER SYNC] Mirrored ${mirrored} freelancers to category sheets`);
        result = { mirrored };
        break;
      }
      // ============= FREELANCER ASSIGNMENTS (BOOKED CLIENTS FREELANCERS) =============
      case 'getClientFreelancerAssignments': {
        if (!data || !data.registeredDateTimeAD) throw new Error('registeredDateTimeAD is required');
        result = await getClientFreelancerAssignments(accessToken, spreadsheetId, data.registeredDateTimeAD as string);
        break;
      }
      case 'updateFreelancerAssignment': {
        if (!data || !data.registeredDateTimeAD || !data.eventName || !data.eventDateAD || !data.field)
          throw new Error('registeredDateTimeAD, eventName, eventDateAD, and field are required');
        result = await updateFreelancerAssignmentAction(accessToken, spreadsheetId, data as Record<string, unknown>);
        break;
      }
      case 'checkFreelancerAvailability': {
        if (!data || !data.freelancerName || !data.eventDateAD) throw new Error('freelancerName and eventDateAD are required');
        result = await checkFreelancerAvailability(accessToken, spreadsheetId, data.freelancerName as string, data.eventDateAD as string);
        break;
      }
      case 'fullSyncFreelancerAssignments': {
        result = await fullSyncFreelancerAssignments(accessToken, spreadsheetId);
        break;
      }
      case 'getFreelancerBookings': {
        if (!data || !data.freelancerName) throw new Error('freelancerName is required');
        result = await getFreelancerBookings(accessToken, spreadsheetId, data.freelancerName as string);
        break;
      }
      case 'getAllFreelancerAssignments': {
        result = await getAllFreelancerAssignments(accessToken, spreadsheetId);
        break;
      }
      case 'restoreFreelancerAssignments': {
        if (!data || !data.updates) throw new Error('updates array is required');
        result = await restoreFreelancerAssignmentsAction(accessToken, spreadsheetId, data.updates as any[]);
        break;
      }
      case 'updateRequiredCrewCategories': {
        if (!data || !data.registeredDateTimeAD || !data.eventName || !data.eventDateAD)
          throw new Error('registeredDateTimeAD, eventName, eventDateAD are required');
        result = await updateRequiredCrewCategories(accessToken, spreadsheetId, data.registeredDateTimeAD as string, data.eventName as string, data.eventDateAD as string, (data.categories as string) || '');
        break;
      }
      case 'deleteClient': {
        if (!data || !data.registeredDateTimeAD) throw new Error('registeredDateTimeAD is required for deleteClient');
        result = await deleteClientFromAll(accessToken, spreadsheetId, data.registeredDateTimeAD as string, (data.sheetSource as string) || 'tracker');
        break;
      }
      case 'reconcileBookedClients': {
        result = await reconcileBookedClients(accessToken, spreadsheetId);
        break;
      }
      case 'pullStorageDevices': {
        // DISABLED: Supabase is the absolute source of truth. Sheets are only a mirror.
        console.log('[pullStorageDevices] Pull action is disabled. Supabase is source of truth.');
        result = { success: true, message: 'Pull from sheets disabled. Supabase is source of truth.', count: 0 };
        break;
      }
      case 'pushFilesToSheet': {
        result = await pushFilesToSheetAction(accessToken, !!data?.fullClean);
        break;
      }
      case 'pushStorageDevicesToSheet': {
        result = await pushStorageDevicesToSheetAction(accessToken);
        break;
      }
      // ============= VIDEO EDIT TRACKER =============
      case 'getVideoEditRows': {
        result = await getVideoEditRows(accessToken, spreadsheetId);
        break;
      }
      case 'updateVideoEditRow': {
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for updateVideoEditRow');
        result = await updateVideoEditRow(accessToken, spreadsheetId, data.rowNumber as number, data.updates as Record<string, string> || {});
        break;
      }
      case 'generateVideoEditRows': {
        result = await generateVideoEditRows(accessToken, spreadsheetId);
        break;
      }
      case 'pushVideoEditToLab': {
        if (!data || !data.rowNumber) throw new Error('rowNumber is required for pushVideoEditToLab');
        result = await pushVideoEditToLab(accessToken, spreadsheetId, data.rowNumber as number);
        break;
      }
      case 'pushVideoEditsToSheet': {
        result = await pushVideoEditsToSheetAction(accessToken);
        break;
      }
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
