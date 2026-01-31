
# Plan: Add Last Activity Timestamp Log (Column AJ) for Accurate Activity Ordering

## Problem

The "Breaking News" section is not showing activities in proper chronological order because:
1. Timestamps are scattered across different columns (W, Y, AC, AE) with inconsistent formats
2. Some activities have no reliable timestamp at all
3. Parsing timestamps from existing columns is error-prone

## Solution

Add a new **Column AJ: Last Activity Timestamp** to both sheets:
- `CLIENT TRACKER!AJ`
- `BOOKED CLIENTS!AJ`

This column will be the **single source of truth** for activity ordering in the Breaking News feed.

### Log Format
```text
01/31/2026 10:15:45 | STATUS_CHANGE | BOOKED
01/31/2026 09:30:12 | COMMENT | Called back for follow-up
01/30/2026 15:45:00 | PAYMENT | NPR 50,000 received
01/30/2026 14:20:30 | CALL | 2ND DIRECT CALL
01/29/2026 11:00:00 | CLIENT_ADDED | New registration
```

Each line contains:
- **Timestamp**: `MM/DD/YYYY HH:MM:SS` (Nepal timezone)
- **Activity Type**: `STATUS_CHANGE`, `COMMENT`, `PAYMENT`, `CALL`, `QUOTATION`, `CLIENT_ADDED`, `FINAL_QUOTATION`, `HANDLER_CHANGE`, etc.
- **Details**: Brief description of the activity

---

## Technical Changes

### 1. Backend: Update Data Interfaces

**File:** `supabase/functions/google-sheets/index.ts`

Add `lastActivityLog` (Column AJ, index 35) to all data mapping functions:

```typescript
// In mapRowToClient and getClients functions
lastActivityLog: row[35] || '',  // Column AJ - Activity timestamp log
```

### 2. Backend: Create Helper Function for Activity Logging

**File:** `supabase/functions/google-sheets/index.ts`

Create a reusable function to append activity entries:

```typescript
async function appendActivityLog(
  accessToken: string,
  spreadsheetId: string,
  sheetName: 'CLIENT TRACKER' | 'BOOKED CLIENTS',
  rowNumber: number,
  activityType: string,
  details: string,
  existingLog: string
): Promise<string> {
  // Generate Nepal timezone timestamp
  const now = new Date();
  const nepalOffset = 5 * 60 + 45; // 5:45 in minutes
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const nepalTime = new Date(utcTime + (nepalOffset * 60000));
  
  const timestamp = `${String(nepalTime.getMonth() + 1).padStart(2, '0')}/${String(nepalTime.getDate()).padStart(2, '0')}/${nepalTime.getFullYear()} ${String(nepalTime.getHours()).padStart(2, '0')}:${String(nepalTime.getMinutes()).padStart(2, '0')}:${String(nepalTime.getSeconds()).padStart(2, '0')}`;
  
  const newEntry = `${timestamp} | ${activityType} | ${details}`;
  const updatedLog = existingLog ? `${newEntry}\n${existingLog}` : newEntry;
  
  // Write to Column AJ
  const range = encodeURIComponent(`'${sheetName}'!AJ${rowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[updatedLog]] }),
  });
  
  return updatedLog;
}
```

### 3. Backend: Update All Activity-Generating Functions

Add activity logging to each function that modifies client data:

| Function | Activity Type | Details Format |
|----------|--------------|----------------|
| `updateClientStatus` | `STATUS_CHANGE` | Status name (e.g., "BOOKED") |
| `addClientComment` / `addBookedClientComment` | `COMMENT` | First 50 chars of comment |
| `addPayment` | `PAYMENT` | "NPR X,XXX received via BANK" |
| `logCallAttempt` | `CALL` | "1ST DIRECT CALL" |
| `updateClientQuotation` | `QUOTATION` | Package name and amount |
| `updateFinalQuotation` | `FINAL_QUOTATION` | Package name and amount |
| `addClient` | `CLIENT_ADDED` | "New registration" |
| `updateClientHandler` | `HANDLER_CHANGE` | "Assigned to HandlerName" |
| `updateClientMindset` | `MINDSET` | Mindset value |

Example for `updateClientStatus`:
```typescript
async function updateClientStatus(...) {
  // ... existing status update logic ...
  
  // Append to activity log (Column AJ)
  await appendActivityLog(
    accessToken,
    spreadsheetId,
    'CLIENT TRACKER',
    actualRowNumber,
    'STATUS_CHANGE',
    newStatus,
    existingActivityLog // Need to fetch this first
  );
  
  return { success: true, ... };
}
```

### 4. Backend: Update `addClient` to Initialize Activity Log

**File:** `supabase/functions/google-sheets/index.ts`

When a new client is added, initialize Column AJ with the first entry:

```typescript
// In addClient function, after creating row data
const activityLog = `${timestamp} | CLIENT_ADDED | New registration from ${source}`;

// Add to row values at index 35 (Column AJ)
rowValues[35] = activityLog;
```

### 5. Frontend: Update Data Types

**File:** `src/lib/sheets-api.ts`

Add `lastActivityLog` to `ClientData` interface:

```typescript
export interface ClientData {
  // ... existing fields ...
  serviceTypes?: string;           // Column AI
  lastActivityLog?: string;        // Column AJ - Activity timestamp log
  _source?: 'tracker' | 'booked';
}
```

### 6. Frontend: Update Activity Parser to Use Column AJ

**File:** `src/lib/activity-utils.ts`

Rewrite `parseActivities` to use the new structured log:

```typescript
// Parse structured activity log from Column AJ
function parseActivityLogColumn(client: ClientData | BookedClientData): ActivityItem[] {
  const activities: ActivityItem[] = [];
  const log = client.lastActivityLog;
  const handlerName = client.clientHandler;
  
  if (!log) return activities;
  
  const lines = log.split('\n').filter(Boolean);
  
  lines.forEach((line, index) => {
    // Format: "MM/DD/YYYY HH:MM:SS | TYPE | Details"
    const parts = line.split(' | ');
    if (parts.length < 3) return;
    
    const [timestampStr, activityType, ...detailParts] = parts;
    const details = detailParts.join(' | '); // Rejoin in case details contain |
    
    // Parse timestamp
    const match = timestampStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (!match) return;
    
    const [, month, day, year, hours, mins, secs] = match.map(Number);
    const timestamp = new Date(year, month - 1, day, hours, mins, secs);
    
    if (isNaN(timestamp.getTime())) return;
    
    // Map activity type
    const type = mapActivityType(activityType);
    
    activities.push({
      id: `log-${client.registeredDateTimeAD}-${index}`,
      type,
      clientName: client.clientName || 'Unknown',
      clientId: client.registeredDateTimeAD || '',
      handlerName,
      description: getActivityDescription(activityType, details),
      details,
      timestamp,
      relativeTime: getRelativeTime(timestamp),
    });
  });
  
  return activities;
}

function mapActivityType(typeStr: string): ActivityType {
  switch (typeStr.toUpperCase()) {
    case 'STATUS_CHANGE': return 'status';
    case 'COMMENT': return 'comment';
    case 'PAYMENT': return 'payment';
    case 'CALL': return 'call';
    case 'CLIENT_ADDED': return 'client_added';
    case 'QUOTATION':
    case 'FINAL_QUOTATION': return 'status';
    default: 
      if (typeStr.includes('BOOKED')) return 'booking';
      return 'status';
  }
}
```

### 7. Backend: Fetch Activity Log Before Updates

Each update function needs to first fetch the current value of Column AJ before appending:

```typescript
// Helper to get current activity log
async function getCurrentActivityLog(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  rowNumber: number
): Promise<string> {
  const range = encodeURIComponent(`'${sheetName}'!AJ${rowNumber}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) return '';
  
  const data = await response.json();
  return data.values?.[0]?.[0] || '';
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/google-sheets/index.ts` | 1. Add `lastActivityLog` (index 35) to all mapRow functions<br>2. Create `appendActivityLog` helper<br>3. Create `getCurrentActivityLog` helper<br>4. Update `updateClientStatus` to log activity<br>5. Update `addClientComment` to log activity<br>6. Update `addBookedClientComment` to log activity<br>7. Update `addPayment` to log activity<br>8. Update `logCallAttempt` to log activity<br>9. Update `updateClientQuotation` to log activity<br>10. Update `updateFinalQuotation` to log activity<br>11. Update `addClient` to initialize activity log<br>12. Update `updateClientHandler` to log activity |
| `src/lib/sheets-api.ts` | Add `lastActivityLog?: string` to `ClientData` interface |
| `src/lib/activity-utils.ts` | 1. Add `parseActivityLogColumn` function<br>2. Update `parseActivities` to prioritize Column AJ data<br>3. Keep existing parsers as fallback for old data |

---

## Expected Activity Log Format

```text
Column AJ Example:
01/31/2026 10:15:45 | STATUS_CHANGE | BOOKED
01/31/2026 09:30:12 | COMMENT | Called back for follow-up discussion
01/30/2026 15:45:00 | PAYMENT | NPR 50,000 received via ESEWA
01/30/2026 14:20:30 | CALL | 2ND DIRECT CALL
01/29/2026 11:00:00 | CLIENT_ADDED | New registration from Instagram
```

**Benefits:**
- Single column for all activities = easy filtering
- Consistent timestamp format = accurate sorting
- Newest entry on TOP = instant latest activity lookup
- Type included = filtering by activity type

---

## Migration Strategy

1. **New clients**: Column AJ initialized on registration
2. **Existing clients**: Column AJ starts empty, gets populated as activities happen
3. **Fallback**: If Column AJ is empty, the system falls back to parsing old columns (W, Y, AC, AE)

This ensures backward compatibility while building the new activity log over time.

---

## Expected Result

1. Every action (status change, comment, payment, call, etc.) writes to Column AJ
2. Breaking News reads from Column AJ first (accurate timestamps)
3. Falls back to parsing other columns if AJ is empty
4. Activities are now guaranteed to be in chronological order
5. Can filter activities by type in the future using the log data
