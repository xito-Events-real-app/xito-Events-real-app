

# Separate Refresh (Fast) from Sync Clients (Full Chain) with Concurrency Guard

## Current Problem
Both "Sync Clients" and "Refresh" buttons call the same heavy `handleSync` function, which runs the full 3-step chain. The Refresh button should be instant.

## Changes to `src/components/suite/AllClientsCrewTable.tsx`

### 1. Add concurrency guard (`isBusy` ref)
A new `useRef(false)` that all heavy operations (Sync, Restore) check before starting. If busy, background syncs skip silently; manual syncs show a toast warning.

### 2. Refresh button becomes lightweight
- New `refreshing` state for its own spinner
- Calls `loadData()` only (reads directly from `BOOKED CLIENTS FREELANCERS` sheet via `getAllFreelancerAssignments`)
- No syncing, no comparing -- just pulls whatever is currently in the freelancers sheet

### 3. Sync Clients button stays heavy (full chain)
- Keeps the existing 3-step chain which syncs FROM the `BOOKED CLIENTS` sheet:
  - Step 1: `fullSyncEventDetails` -- syncs EVENT DETAILS against BOOKED CLIENTS
  - Step 2: `fullSyncFreelancerAssignments` -- syncs FREELANCERS against EVENT DETAILS
  - Step 3: `fullSyncContactDetails` -- syncs CONTACT DETAILS against BOOKED CLIENTS
- Now wrapped with `isBusy` guard

### 4. Background 30-min interval keeps full sync but respects busy guard
- Still runs `handleSync(true)` every 30 minutes
- If `isBusy` is true (manual sync or restore running), it silently skips that cycle

### 5. Cache invalidation listeners become lightweight
- `clients-invalidate` and `booked-clients-invalidate` events call `loadData()` instead of `handleSync(true)` -- they just refresh the UI data

### 6. Restore upload also sets `isBusy`
- Prevents background sync from colliding with an active restore operation

## Technical Summary

```
// Concurrency guard
const isBusy = useRef(false);

// Refresh = fast (just read sheet)
const handleRefresh = async () => {
  setRefreshing(true);
  await loadData(); // Reads from BOOKED CLIENTS FREELANCERS
  setRefreshing(false);
};

// Sync = heavy (full chain from BOOKED CLIENTS)
const handleSync = async (silent) => {
  if (isBusy.current) { if (!silent) toast("Another sync running"); return; }
  isBusy.current = true;
  try {
    // Step 1: EVENT DETAILS vs BOOKED CLIENTS
    // Step 2: FREELANCERS vs EVENT DETAILS  
    // Step 3: CONTACT DETAILS vs BOOKED CLIENTS
    await loadData();
  } finally { isBusy.current = false; }
};

// Background: full sync, but skip if busy
setInterval(() => handleSync(true), 30 * 60 * 1000);

// Cache events: lightweight only
window.addEventListener('clients-invalidate', () => loadData());
```

No backend changes needed -- all 3 sync actions already compare against the BOOKED CLIENTS sheet as the source of truth.

