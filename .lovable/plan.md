
# Fix: Sync Clients Button and Refresh Not Working (Stale Closure Bug)

## Problem

The `handleSync` function has a **stale closure bug**. It references the `syncing` state variable inside its body, but `syncing` is NOT included in its `useCallback` dependency array (`[loadData]`). This means:

1. The `if (syncing) return` guard always sees `false` (the initial value), so it NEVER blocks
2. Multiple syncs can run in parallel (mount sync + user click + interval timer) and interfere with each other
3. When parallel syncs complete, their `loadData()` calls race against each other, causing data to flicker or appear empty
4. The silent mount sync and 30-minute interval syncs can overlap with user-triggered syncs, causing the user's sync results to be overwritten

## Fix

### File: `src/components/suite/AllClientsCrewTable.tsx`

**Use a `useRef` for the sync guard** instead of state. This avoids the stale closure problem entirely and properly prevents concurrent syncs:

1. Add a `syncingRef = useRef(false)` to track whether a sync is actually running
2. Use `syncingRef.current` as the guard in `handleSync` (always reads the latest value, no stale closure)
3. Keep the `syncing` state for UI rendering only (button disabled state, "Syncing..." text)
4. Set `syncingRef.current = true` at the start and `false` in the finally block
5. Remove `syncing` from the closure guard entirely

```typescript
// Add ref for concurrency guard
const syncingRef = useRef(false);

const handleSync = useCallback(async (silent = false) => {
  if (syncingRef.current) return; // Ref always has latest value - no stale closure
  syncingRef.current = true;
  if (!silent) setSyncing(true);
  try {
    // ... sync steps (unchanged)
    await loadData();
  } catch (err) {
    if (!silent) toast.error("Sync failed");
  } finally {
    syncingRef.current = false;
    if (!silent) setSyncing(false);
  }
}, [loadData]);
```

This ensures:
- Only ONE sync runs at a time (mount, interval, or user click)
- The user's manual sync always completes fully before another can start
- No parallel data fetches overwriting each other
- The button correctly shows "Syncing..." during the operation

## Result

- Sync Clients button will properly trigger a sync and show results
- Refresh button will fetch the latest FREELANCERS sheet data
- No more parallel sync interference causing data to appear empty
- New booked clients will appear after sync completes (assuming they have events set up)

## Files to Modify

1. `src/components/suite/AllClientsCrewTable.tsx`
