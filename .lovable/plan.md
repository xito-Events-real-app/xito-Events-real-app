

# Fix: Remove Duplicate Booked Clients from Client Tracker

## Problem

Multiple booked clients exist in BOTH sheets because:
1. **`updateBookedClient` (lines 5410-5423)** writes non-payment field updates BACK to CLIENT TRACKER, re-creating rows that should have been deleted
2. **`resyncAllBookedClients`** never calls the existing `cleanupDuplicateBookedFromTracker` function, so duplicates are never auto-cleaned

## Fix (2 changes in 1 file)

### File: `supabase/functions/google-sheets/index.ts`

**Change 1 -- Remove tracker write-back from `updateBookedClient` (lines 5410-5423)**

Delete the entire block that syncs non-payment fields to CLIENT TRACKER. A BOOKED client should ONLY exist in BOOKED CLIENTS -- writing to the tracker is always wrong.

```
// DELETE this block entirely (lines 5410-5423):
if (!paymentOnlyFields.includes(field) && originalRowNumber >= 2) {
  const trackerRange = ...
  await fetch(trackerUrl, { method: 'PUT', ... });
}
```

**Change 2 -- Auto-cleanup duplicates after resync (after line 5157)**

Add a call to the existing `cleanupDuplicateBookedFromTracker` at the end of `resyncAllBookedClients` so any lingering duplicates are purged automatically on every sync.

```typescript
// After the resync loop, before returning:
await cleanupDuplicateBookedFromTracker(accessToken, spreadsheetId);
```

## Result

- All existing duplicates (AAKAR EVENTS and others) will be removed from CLIENT TRACKER on the next resync or Master Sync
- Future booked client updates will never write back to the tracker
- Payment data remains protected (previous fix unchanged)
- Single source of truth fully enforced

## Files to Modify

1. `supabase/functions/google-sheets/index.ts`

