
# Plan: Remove BOOKED Clients from CLIENT TRACKER (Single Source of Truth)

## ✅ STATUS: IMPLEMENTED

This plan was approved and implemented on 2026-01-30.

---

## Overview

This plan restructured the data flow so that **clients with BOOKED status are ONLY stored in the BOOKED CLIENTS sheet**, removing them from the CLIENT TRACKER. This creates a true single source of truth architecture.

---

## Implemented Architecture

```text
┌──────────────────────────────────┐      ┌──────────────────────────────────┐
│        CLIENT TRACKER            │      │        BOOKED CLIENTS            │
│  (Non-booked clients ONLY)       │      │   (BOOKED clients ONLY)          │
│  - Just Enquired                 │      │   - Status: BOOKED               │
│  - Quotation Sent                │      │   - Payment Data (Single Source) │
│  - Bargaining                    │      │   - Event Details                │
│  - Advance Pending               │      │                                  │
│  - Cancelled / Gone Elsewhere    │      │                                  │
└──────────────────────────────────┘      └──────────────────────────────────┘
              │                                        │
              ▼                                        ▼
     Active Sales Pipeline                    Confirmed Bookings
              │                                        │
              └──────────────┬─────────────────────────┘
                             ▼
                     COMBINED DATA
           Hot Dates, Calendar, Search, etc.
           (getAllClients fetches from BOTH sheets)
```

---

## Changes Implemented

### 1. Backend: New `getAllClientsFromBothSheets` Function ✅
**File**: `supabase/functions/google-sheets/index.ts`

- Merges data from CLIENT TRACKER and BOOKED CLIENTS
- Returns unified client list with `_source` indicator
- Used by Hot Dates, Calendar, Search features

### 2. Backend: New `deleteTrackerRow` Function ✅
**File**: `supabase/functions/google-sheets/index.ts`

- Deletes a row from CLIENT TRACKER using Google Sheets batchUpdate API
- Used when moving a client to BOOKED CLIENTS

### 3. Backend: Modified `updateClientStatus` ✅
**File**: `supabase/functions/google-sheets/index.ts`

- When status changes TO "BOOKED":
  1. First updates status in CLIENT TRACKER
  2. Copies client row to BOOKED CLIENTS sheet
  3. **DELETES the row from CLIENT TRACKER** (MOVE operation)
- Returns `movedToBooked: true` when client is moved

### 4. Backend: Modified `searchClients` ✅
**File**: `supabase/functions/google-sheets/index.ts`

- Now uses `getAllClientsFromBothSheets` for unified search
- Searches across BOTH sheets to find all clients

### 5. Frontend: Updated `useCachedData` Hook ✅
**File**: `src/hooks/useCachedData.ts`

- Now calls `getAllClients` action instead of `getClients`
- Fetches unified data from both sheets
- Hot Dates, Calendar, and all client views work seamlessly

### 6. Frontend: Updated `sheets-api.ts` ✅
**File**: `src/lib/sheets-api.ts`

- Added `getAllClients()` function for unified data
- Updated `ClientData` interface with `_source` field

---

## Payment Data: BOOKED CLIENTS is Single Source of Truth ✅

**Previously Implemented**:
- Columns AE (Payments Made), AF (Payment Date), AG (Remaining Payment)
- Only written to and read from BOOKED CLIENTS sheet
- Full Resync skips these columns to preserve payment data

---

## Technical Details

### Row Deletion Operation
```typescript
async function deleteTrackerRow(accessToken, spreadsheetId, rowNumber) {
  const sheetId = await getSheetId(accessToken, spreadsheetId, 'CLIENT TRACKER');
  
  await fetch(`${spreadsheetId}:batchUpdate`, {
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
}
```

### Unified Client Query
```typescript
async function getAllClientsFromBothSheets(accessToken, spreadsheetId, limit) {
  const [trackerClients, bookedClients] = await Promise.all([
    getClients(accessToken, spreadsheetId, limit),
    getBookedClients(accessToken, spreadsheetId, limit),
  ]);
  
  const mappedBookedClients = bookedClients.map(client => ({
    ...client,
    rowNumber: client.bookedRowNumber,
    _source: 'booked',
  }));
  
  return [...trackerClients, ...mappedBookedClients];
}
```

---

## Migration Notes

### For Existing Data
- Existing BOOKED clients in CLIENT TRACKER will remain until:
  1. Manual cleanup, OR
  2. Running a one-time migration script
- New bookings after this implementation will be MOVED, not copied

### One-Time Cleanup Script (Manual)
To clean up existing duplicates, you can run a migration that:
1. Gets all clients from BOOKED CLIENTS (by registeredDateTimeAD)
2. Finds matching rows in CLIENT TRACKER
3. Deletes those rows from CLIENT TRACKER

---

## Key Benefits

1. **Single Source of Truth**: BOOKED clients exist in ONE place only
2. **No More Two-Way Sync**: Simplifies data management
3. **Payment Data Isolation**: Financial data protected in BOOKED CLIENTS
4. **Unified Queries**: All features see consistent data via `getAllClients`

---

## Files Modified

| File | Changes |
|------|---------|
| `supabase/functions/google-sheets/index.ts` | Added `getAllClientsFromBothSheets`, `deleteTrackerRow`, `deleteBookedRow`, modified `updateClientStatus`, `searchClients` |
| `src/lib/sheets-api.ts` | Added `getAllClients()`, updated `ClientData` interface |
| `src/hooks/useCachedData.ts` | Changed to use `getAllClients` action |
