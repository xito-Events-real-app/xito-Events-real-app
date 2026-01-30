
# Plan: Cleanup Duplicates & Fix Sync to Respect Single Source of Truth

## Overview

This plan implements two major changes:
1. Creates a **one-time cleanup action** to delete existing BOOKED clients from CLIENT TRACKER (keeping them only in BOOKED CLIENTS)
2. Modifies all **sync functions** to NEVER copy clients from CLIENT TRACKER to BOOKED CLIENTS (the only way to get into BOOKED CLIENTS is via status change to "BOOKED")

---

## Current Problem

The `fullResyncAllBookedClients` function currently has logic that:
- **Phase 0**: Copies clients from BOOKED → TRACKER if missing (reverse sync)
- **Phase 1**: Copies clients from TRACKER → BOOKED if they have BOOKED status
- **Phase 2**: Syncs data between sheets

This contradicts the new Single Source of Truth architecture where:
- BOOKED clients should ONLY exist in BOOKED CLIENTS sheet
- CLIENT TRACKER should NOT contain BOOKED clients

---

## Architecture After Changes

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                          STATUS CHANGE TO "BOOKED"                          │
│                   (This is the ONLY way into BOOKED CLIENTS)                │
└────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌──────────────────────────────────┐      ┌──────────────────────────────────┐
│        CLIENT TRACKER            │      │        BOOKED CLIENTS            │
│  (Non-booked clients ONLY)       │      │   (BOOKED clients ONLY)          │
│  - All other statuses            │      │   - Single source of truth       │
│                                  │      │   - Payment data lives here      │
└──────────────────────────────────┘      └──────────────────────────────────┘
              │                                        │
              │                                        │
              ▼                                        ▼
     ┌────────────────────────────────────────────────────────────────┐
     │                         SYNC OPERATIONS                         │
     │                                                                 │
     │  ✅ Event Details Sync: BOOKED CLIENTS → EVENT DETAILS         │
     │  ✅ Contact Details Sync: BOOKED CLIENTS → CONTACT DETAILS     │
     │  ✅ Vendor Sync: Refresh vendor data for booked clients        │
     │  ❌ NO copying from Tracker → Booked (removed)                 │
     └────────────────────────────────────────────────────────────────┘
```

---

## Changes Required

### 1. Backend: Create `cleanupDuplicateBookedFromTracker` Function
**File**: `supabase/functions/google-sheets/index.ts`

New function that:
- Fetches all clients from BOOKED CLIENTS (by `registeredDateTimeAD`)
- For each, checks if they exist in CLIENT TRACKER
- If found in both, DELETES from CLIENT TRACKER
- Returns count of deleted duplicates

```text
Algorithm:
1. Fetch all registeredDateTimeAD from BOOKED CLIENTS
2. Fetch all rows from CLIENT TRACKER with registeredDateTimeAD
3. Build a map of TRACKER: registeredDateTimeAD → rowNumber
4. For each BOOKED client:
   - If exists in TRACKER map → delete that TRACKER row
   - Track deleted count
5. Return { deletedCount, deletedClients }
```

### 2. Backend: Modify `fullResyncAllBookedClients` Function
**File**: `supabase/functions/google-sheets/index.ts`

Changes:
- **REMOVE Phase 0** (no longer restore from Booked → Tracker)
- **REMOVE Phase 1** (no longer copy from Tracker → Booked)
- **KEEP Phase 2 simplified**: Only sync NON-PAYMENT columns from BOOKED CLIENTS to ensure data consistency (but don't add new clients)

The sync now becomes a "refresh" operation - it updates existing BOOKED CLIENTS records but never creates new ones. New clients enter BOOKED CLIENTS ONLY via status change.

### 3. Backend: Add `cleanupDuplicateBookedFromTracker` Action
**File**: `supabase/functions/google-sheets/index.ts`

Add to the action switch statement to expose the cleanup function.

### 4. Frontend: Add API Wrapper for Cleanup
**File**: `src/lib/sheets-api.ts`

```typescript
export async function cleanupDuplicateBookedFromTracker(): Promise<{
  success: boolean;
  deletedCount: number;
  deletedClients: string[];
}> {
  return callSheetsFunction("cleanupDuplicateBookedFromTracker");
}
```

### 5. Frontend: Update Master Sync Button Description
**File**: `src/components/suite/MasterSyncButton.tsx`

Update Phase 2 description from "Syncing to booked clients sheet..." to "Validating booked clients data..." since it no longer copies.

### 6. Frontend: Add Cleanup Button to Booked Clients Settings
**Optional**: Add a one-time "Cleanup Duplicates" button in the Booked Clients module for manual trigger.

---

## Technical Details

### Cleanup Function Logic

```typescript
async function cleanupDuplicateBookedFromTracker(
  accessToken: string, 
  spreadsheetId: string
) {
  // 1. Get all BOOKED CLIENTS registeredDateTimeAD values
  const bookedIds = await fetchBookedClientIds();
  
  // 2. Get all TRACKER rows with their registeredDateTimeAD
  const trackerRows = await fetchTrackerRows();
  
  // 3. Build deletion list (rows to delete from tracker)
  const rowsToDelete = [];
  for (const trackerRow of trackerRows) {
    if (bookedIds.has(trackerRow.registeredDateTimeAD)) {
      rowsToDelete.push(trackerRow.rowNumber);
    }
  }
  
  // 4. Delete rows in reverse order (highest first to avoid index shifting)
  rowsToDelete.sort((a, b) => b - a); // Descending
  
  for (const rowNumber of rowsToDelete) {
    await deleteTrackerRow(accessToken, spreadsheetId, rowNumber);
  }
  
  return { deletedCount: rowsToDelete.length };
}
```

### Modified fullResyncAllBookedClients

The function becomes simpler:
1. Fetch BOOKED CLIENTS data
2. For each booked client, check if their NON-PAYMENT data needs refresh
3. NO copying of new clients
4. Return sync report

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/google-sheets/index.ts` | Add `cleanupDuplicateBookedFromTracker`, modify `fullResyncAllBookedClients` to remove copy logic |
| `src/lib/sheets-api.ts` | Add `cleanupDuplicateBookedFromTracker` wrapper |
| `src/components/suite/MasterSyncButton.tsx` | Update Phase 2 description |
| `src/components/booked/SyncReportSheet.tsx` | Update UI to reflect no copying |

---

## Important Notes

1. **One-Way Flow**: After this change, the ONLY way to add a client to BOOKED CLIENTS is via status change to "BOOKED"
2. **Cleanup is Safe**: The cleanup only deletes from TRACKER if the client exists in BOOKED CLIENTS (no data loss)
3. **Payment Data Protected**: Payment columns (AE, AF, AG) in BOOKED CLIENTS are never touched during sync
4. **Reversibility**: If a client's status changes FROM BOOKED to something else, they should be moved back to TRACKER (this logic already exists)

---

## Testing Checklist

After implementation:
1. Run the cleanup to delete duplicates from TRACKER
2. Verify Master Sync no longer copies clients to BOOKED CLIENTS
3. Verify status change to BOOKED still moves client correctly
4. Verify Hot Dates, Calendar, Search still show all clients (via unified endpoint)
5. Verify payment data is preserved during any sync operation
