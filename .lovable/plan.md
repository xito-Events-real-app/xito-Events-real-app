

# Fix: Complete 4-Sheet Sync from Refresh Button on All Clients Page

## Problem

The "All Clients" page is missing booked clients because the sync chain is incomplete. When a client is added to BOOKED CLIENTS, the downstream sheets (EVENT DETAILS, FREELANCERS, CONTACT DETAILS) need to be populated. Currently:

- `fullSyncEventDetails` populates and cleans EVENT DETAILS (working)
- `fullSyncFreelancerAssignments` populates and cleans FREELANCERS (working)
- `fullSyncContactDetails` populates and cleans CONTACT DETAILS (working -- but NOT triggered from Refresh button or 30-min interval)

The Refresh button on the All Clients page only calls `fullSyncEventDetails` and `fullSyncFreelancerAssignments`. It does NOT call `fullSyncContactDetails`. Additionally, the complete chain needs to be reliable and run in the correct order every time.

## Solution

Update the `handleSync` function in `AllClientsCrewTable.tsx` to run the complete 4-sheet sync chain on every Refresh click and every 30-minute interval:

```
BOOKED CLIENTS (source of truth)
  --> fullSyncEventDetails (populate + cleanup EVENT DETAILS)
  --> fullSyncFreelancerAssignments (populate + cleanup FREELANCERS)
  --> fullSyncContactDetails (populate + cleanup CONTACT DETAILS)
  --> Reload UI data
```

## Files to Change

### 1. `src/components/suite/AllClientsCrewTable.tsx`

Update `handleSync` to call all three sync functions sequentially:

1. `fullSyncEventDetails` -- syncs and cleans EVENT DETAILS against BOOKED CLIENTS
2. `fullSyncFreelancerAssignments` -- syncs and cleans FREELANCERS against EVENT DETAILS
3. `fullSyncContactDetails` -- syncs and cleans CONTACT DETAILS against BOOKED CLIENTS
4. Reload the crew data for UI

This runs on:
- Every manual Refresh/Sync button click
- Every 30-minute background interval
- On mount (first load)
- On `clients-invalidate` / `booked-clients-invalidate` events

### Technical Detail

```typescript
// handleSync update in AllClientsCrewTable.tsx
const handleSync = useCallback(async (silent = false) => {
  if (!silent) setSyncing(true);
  try {
    // Step 1: Sync EVENT DETAILS (populate new + remove stale)
    await supabase.functions.invoke('google-sheets', {
      body: { action: 'fullSyncEventDetails' }
    });
    // Step 2: Sync FREELANCERS (populate new + remove stale)
    const result = await fullSyncFreelancerAssignments();
    // Step 3: Sync CONTACT DETAILS (populate new + remove stale)
    await supabase.functions.invoke('google-sheets', {
      body: { action: 'fullSyncContactDetails' }
    });
    if (!silent) {
      toast.success(`Synced! ${result.copiedCount} new, ${result.updatedCount} updated`);
    }
    await loadData();
  } catch (err) {
    if (!silent) toast.error("Sync failed");
  } finally {
    if (!silent) setSyncing(false);
  }
}, [loadData]);
```

This ensures all 4 sheets stay in sync on every trigger -- manual, interval, or event-driven.

