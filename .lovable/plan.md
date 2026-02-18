
# Root Cause: Why Shyam Poudel (or Any Client) Ends Up in Both Sheets

## The Core Bug in `addClient`

The `addClient` backend function (line 2644-2654 of `google-sheets/index.ts`) has a **half-implemented BOOKED status handler**:

```
// Current broken logic in addClient:
if (status === 'BOOKED') {
  copyToBookedClients(...)   ← copies to BOOKED CLIENTS ✅
  // ← NEVER deletes from CLIENT TRACKER ❌
}
```

Compare this to `updateClientStatus` (the correct flow at line 2153-2159) which correctly does both:
```
// Correct logic in updateClientStatus:
copyToBookedClients(...)    ← copies to BOOKED CLIENTS ✅
deleteTrackerRow(...)       ← deletes from CLIENT TRACKER ✅
```

The `addClient` function was designed to always insert to CLIENT TRACKER first (row 2), and it handles BOOKED status by copying to BOOKED CLIENTS — but it **forgets to delete from CLIENT TRACKER**. This means any time a client is added with status BOOKED (e.g. quick-adding from BenzoKeep notepad, or from the full quick-add form), they land in BOTH sheets.

## How This Specifically Happened to Shyam Poudel

The most likely scenario: Shyam Poudel was already a BOOKED client (living in BOOKED CLIENTS sheet). Then at some point he was **re-added** via the Quick Add form or BenzoKeep with status "BOOKED". This created a new CLIENT TRACKER entry for him that was copied to BOOKED CLIENTS but never removed from CLIENT TRACKER — creating the ghost row.

## Why This Is Dangerous

- Benzo Keep note writes to the wrong record (CLIENT TRACKER ghost row) while the real record is in BOOKED CLIENTS
- Status updates, call logs, comments write to the ghost row
- The `cleanupDuplicateBookedFromTracker` function (which runs after Full Resync) should catch and remove these — but it only runs when manually triggered or during a full resync, not automatically

## The Fix

### In `supabase/functions/google-sheets/index.ts`

**In the `addClient` function** (around line 2644), after copying to BOOKED CLIENTS, add the missing delete step — exactly mirroring what `updateClientStatus` does:

```typescript
// If initial status is BOOKED, copy to BOOKED CLIENTS sheet
if (selectedStatus.toUpperCase() === 'BOOKED') {
  const isAlreadyBooked = await checkIfAlreadyBooked(accessToken, spreadsheetId, registeredDateTimeAD);
  if (!isAlreadyBooked) {
    await copyToBookedClients(accessToken, spreadsheetId, 2);
    // ← ADD THIS: Delete from CLIENT TRACKER after copying (MOVE, not COPY)
    await deleteTrackerRow(accessToken, spreadsheetId, 2);
    console.log('[addClient] Client MOVED to BOOKED CLIENTS, removed from TRACKER');
  }
}
```

Note: Row 2 is safe to hardcode here because the insert step always inserts at row 2 immediately before this code runs.

### Immediate Cleanup for Shyam Poudel

The current duplicate (Shyam Poudel in both sheets) needs to be cleaned up by running `cleanupDuplicateBookedFromTracker`. This can be triggered from the Booked Clients page → Full Resync, which automatically calls the cleanup at the end. The user should run a Full Resync once to purge the ghost row from CLIENT TRACKER.

## Files Modified

| File | Change |
|---|---|
| `supabase/functions/google-sheets/index.ts` | Add `deleteTrackerRow(accessToken, spreadsheetId, 2)` after `copyToBookedClients` in the `addClient` function when status is BOOKED |

## Summary

The bug is simple: `addClient` copies to BOOKED CLIENTS when status is BOOKED but never deletes the source row from CLIENT TRACKER. One missing line of code. The fix mirrors the correct logic that already exists in `updateClientStatus`.

To clean up Shyam Poudel's existing duplicate: run Full Resync from the Booked Clients page once — it will auto-clean the ghost row.
