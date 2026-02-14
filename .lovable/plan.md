

# Fix: All Clients Page Auto-Update + Freelancer Auto-Assignment Bug

## Problems Identified

1. **Refresh button doesn't sync**: The "Refresh" button on the All Clients page only re-reads data from the FREELANCERS sheet (`loadData`). It does NOT trigger `fullSyncFreelancerAssignments` to update the sheet first, so new/removed events won't appear until a Master Sync or 30-min interval.

2. **Freelancers incorrectly appearing on new events**: When `syncSingleClientToFreelancers` updates an existing client row, it only writes columns A-H (event info) and preserves columns I-R (freelancer names). However, it does NOT adjust the freelancer columns to match the new event count. If a client previously had 2 events with freelancers assigned (e.g., "John\nJane" in column I), and a 3rd event is added, the column still reads "John\nJane" -- but the newline-indexed parsing can cause misalignment, or old assignments may appear mapped to wrong events.

## Solution

### 1. Refresh Button Triggers Full Sync (AllClientsCrewTable.tsx)

Change the "Refresh" button's `onClick` from just `loadData` to `handleSync(false)` so it triggers `fullSyncFreelancerAssignments` (which updates the sheet) before reading data.

### 2. Fix Freelancer Column Alignment on Event Changes (Edge Function)

Update `syncSingleClientToFreelancers` in the edge function to:
- Compare old event count vs new event count
- When event count changes, re-align freelancer columns (I-R) by:
  - Reading the existing I-R data
  - Padding with empty entries for new events (so new events get blank assignments)
  - Trimming excess entries if events were removed
  - Writing the adjusted I-R data back

This prevents old freelancer assignments from bleeding into newly added event slots.

### Files Modified
- `src/components/suite/AllClientsCrewTable.tsx` -- Refresh button triggers sync
- `supabase/functions/google-sheets/index.ts` -- Fix `syncSingleClientToFreelancers` to realign freelancer columns when event count changes

### Technical Details

**AllClientsCrewTable.tsx change:**
```
// Line 273: Change onClick from loadData to handleSync
<Button onClick={() => handleSync(false)} ...>
```

**Edge function `syncSingleClientToFreelancers` fix:**
When updating an existing row, after writing A-H, also check if the event count changed. If it did, read columns I-R, split each by `\n`, pad/trim to match new event count, and write back I-R. This ensures new events always start with empty freelancer assignments.

