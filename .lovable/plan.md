

# Fix: Clean Up Stale Clients from EVENT DETAILS Sheet

## Problem

The data flows in a chain:

```text
BOOKED CLIENTS --> EVENT DETAILS --> FREELANCERS
```

Currently, the FREELANCERS sheet is cleaned against EVENT DETAILS (already implemented), but EVENT DETAILS itself is never cleaned against BOOKED CLIENTS. So when a client like Prashamsha is removed from BOOKED CLIENTS (e.g., moved to "BOOKED SOMEWHERE ELSE"), her row stays in EVENT DETAILS forever. The FREELANCERS cleanup then sees her in EVENT DETAILS and keeps her too.

## Solution

Add a cleanup phase at the end of `fullSyncEventDetails` that removes rows from EVENT DETAILS whose `registeredDateTimeAD` does not exist in the BOOKED CLIENTS sheet. This cleanup will run:

- During every **Master Sync** (Phase 3 calls `fullSyncEventDetails`)
- During the **30-minute background sync** (by also triggering `fullSyncEventDetails` before `fullSyncFreelancerAssignments` in the All Clients page interval)
- On every manual **Refresh** button click

## Files to Change

### 1. `supabase/functions/google-sheets/index.ts`

At the end of the `fullSyncEventDetails` function (after line 4258, before the return), add:

- Build a `Set` of valid `registeredDateTimeAD` from `bookedData.values`
- Re-read EVENT DETAILS column A to get current rows
- Identify rows where the ID is NOT in the valid set
- Delete those stale rows bottom-up using `batchUpdate` with `deleteDimension` (same proven pattern used in the FREELANCERS cleanup)
- Include `removedCount` in the return value

### 2. `src/components/suite/AllClientsCrewTable.tsx`

Update the `handleSync` function and the 30-minute interval to also call `fullSyncEventDetails` before `fullSyncFreelancerAssignments`. This ensures stale EVENT DETAILS rows are cleaned first, so the FREELANCERS cleanup has accurate source data.

The flow on every sync (manual or interval) will become:

1. Call `fullSyncEventDetails` -- cleans EVENT DETAILS against BOOKED CLIENTS
2. Call `fullSyncFreelancerAssignments` -- cleans FREELANCERS against EVENT DETAILS
3. Reload data from FREELANCERS sheet

## Technical Details

**EVENT DETAILS cleanup logic (edge function):**
```
// After the copy/update loop in fullSyncEventDetails:
const validBookedIds = new Set(
  bookedData.values.map(row => (row[0] || '').trim()).filter(Boolean)
);

// Re-read EVENT DETAILS column A
// Find rows where ID is not in validBookedIds
// Delete bottom-up using batchUpdate deleteDimension
```

**AllClientsCrewTable.tsx handleSync update:**
```
// Before calling fullSyncFreelancerAssignments, first call:
await supabase.functions.invoke('google-sheets', {
  body: { action: 'fullSyncEventDetails' }
});
// Then proceed with fullSyncFreelancerAssignments as before
```

This ensures the entire chain stays clean on every sync cycle -- manual, 30-minute interval, or Master Sync.

