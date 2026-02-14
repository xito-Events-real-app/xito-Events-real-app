

# Master Plan: Eliminate All Duplication Across the 4-Sheet Sync Chain

## Root Cause Analysis

The duplication originates in `fullSyncEventDetails`. Here is exactly what goes wrong:

### Bug 1: Row-shift corruption in `existingEventMap`

The function builds a lookup map of existing EVENT DETAILS rows at the start (step 2). Then in step 3, for each new client, it calls `copyToEventDetails` which **inserts a new row at position 2** using `insertDimension`. This shifts ALL existing rows down by 1. But the `existingEventMap` still holds the OLD row numbers. So:

- Client A is at row 5 in the map
- A new client is inserted at row 2, pushing Client A to row 6
- Next time Client A is looked up, the map says row 5, but row 5 now contains different data
- Client A might get treated as "new" and re-inserted -- creating a duplicate

### Bug 2: Downstream cascade

Since FREELANCERS and CONTACT DETAILS sync FROM EVENT DETAILS (or BOOKED CLIENTS), duplicates in EVENT DETAILS cascade into those sheets too.

## Solution: Rewrite `fullSyncEventDetails` to Use Append (Not Insert-at-2)

Replace the current pattern (insert new row at position 2 + stale map) with the same robust pattern already used by `fullSyncContactDetails` and `fullSyncFreelancerAssignments`:

1. Build map of existing rows
2. Update existing rows in-place (no row shifts)
3. Collect all new entries into an array
4. **Batch append** all new entries at the end using the `:append` API
5. Run cleanup to remove stale rows

This eliminates row-shift corruption entirely.

Additionally, add a **deduplication pass** after the sync to catch any pre-existing duplicates that are already in the sheets from previous runs.

## Files to Change

### 1. `supabase/functions/google-sheets/index.ts` -- `fullSyncEventDetails`

**Replace the new-client insertion logic (lines 4292-4300):**

Instead of calling `copyToEventDetails` (which inserts at row 2), collect new rows into an array and batch-append them after the loop:

```
// Current (BROKEN):
for each booked client:
  if exists: update in-place (fine)
  else: copyToEventDetails() --> inserts at row 2 (SHIFTS ALL ROWS!)

// Fixed:
const newRows = [];
for each booked client:
  if exists: update in-place (fine)
  else: newRows.push([A, B, C, D, E, F, G, H, ''])  // collect

// After loop: batch append all new rows at once
if (newRows.length > 0) {
  append to 'BOOKED CLIENTS EVENT DETAILS'!A:I using :append API
}
```

### 2. `supabase/functions/google-sheets/index.ts` -- Add deduplication pass

After the append and before the cleanup, add a deduplication scan:

- Re-read column A of EVENT DETAILS
- Track seen `registeredDateTimeAD` values
- If a duplicate is found, mark the LATER occurrence for deletion
- Delete duplicates bottom-up

This one-time cleanup will purge any duplicates that already exist from previous buggy syncs.

### 3. `supabase/functions/google-sheets/index.ts` -- `fullSyncFreelancerAssignments` dedup guard

The freelancer sync already uses append (correct), but add a deduplication pass after the append step to catch any pre-existing duplicates, using the same pattern:

- Re-read column A
- Track seen IDs
- Delete duplicate rows bottom-up

### 4. `supabase/functions/google-sheets/index.ts` -- `fullSyncContactDetails` dedup guard

Same deduplication pass for Contact Details -- re-read, track, delete duplicates.

## Execution Order

All changes are in one file (`supabase/functions/google-sheets/index.ts`):

1. Fix `fullSyncEventDetails` to use append instead of insert-at-2
2. Add deduplication pass to `fullSyncEventDetails`
3. Add deduplication pass to `fullSyncFreelancerAssignments`
4. Add deduplication pass to `fullSyncContactDetails`
5. Deploy the edge function

No UI changes needed -- `AllClientsCrewTable.tsx` already calls the full chain correctly.

## Technical Detail

```
// Deduplication helper pattern (used in all 3 sync functions):
const seenIds = new Set<string>();
const dupeRows: number[] = [];
rows.forEach((r, idx) => {
  const key = (r[0] || '').trim();
  if (!key) return;
  if (seenIds.has(key)) {
    dupeRows.push(idx + 2); // mark for deletion
  } else {
    seenIds.add(key);
  }
});
// Delete dupeRows bottom-up using batchUpdate deleteDimension
```

This is the same proven bottom-up deletion pattern already used in the cleanup phases, so it is safe and tested.

## What This Fixes

- No more row-shift corruption in EVENT DETAILS
- No more duplicate clients in any of the 4 sheets
- Pre-existing duplicates from previous syncs are cleaned up automatically
- Safe on every trigger: manual Refresh, 30-min interval, Master Sync, and event-driven
