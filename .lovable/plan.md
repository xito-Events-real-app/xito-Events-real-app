

# Fix Breaking News Not Reflecting Recent Changes

## Root Cause

When you add a client or change a status, the system calls `notifyCacheUpdate('clients')` **without passing the updated clients array**. The listener in `useCachedData` (line 154) checks:

```text
if (e.detail.type === 'clients' && Array.isArray(e.detail.data))
```

Since `data` is `undefined`, `Array.isArray(undefined)` is `false`, so `setClients()` never fires. The Breaking News feed's `useMemo` still has the old `clients` array reference and never recomputes.

## Fix

### File 1: `src/hooks/useCachedData.ts` (lines 152-165)

Update the `cache-updated` event listener to re-read from memory cache when no data array is provided. This way, any `notifyCacheUpdate('clients')` call -- with or without data -- triggers a state refresh.

```typescript
// Current (broken):
if (e.detail.type === 'clients' && Array.isArray(e.detail.data)) {
  setClients(e.detail.data as ClientData[]);
}

// Fixed:
if (e.detail.type === 'clients') {
  if (Array.isArray(e.detail.data)) {
    setClients(e.detail.data as ClientData[]);
  } else {
    // No data passed -- re-read from memory cache
    const memClients = getMemoryClients();
    if (memClients) setClients([...memClients]);
  }
}
```

The `[...memClients]` spread creates a new array reference so React detects the change and re-renders.

### File 2: `src/components/suite/SuiteNewsFeed.tsx` (line 6)

The component still passes `limit=100`, overriding our fix to 200. Update to match:

```typescript
// From:
const { groupedByDay, isLoading, activities } = useActivityFeed(14, 100);
// To:
const { groupedByDay, isLoading, activities } = useActivityFeed(14, 200);
```

### File 3: `src/hooks/useBookedCachedData.ts`

Apply the same fix for booked clients -- when the listener receives a `booked-clients` event without data, re-read from memory cache so booked client activities also update in real-time.

## Result

After these changes, any local mutation (add client, change status, add comment, log call, add payment) will immediately update the Breaking News feed because the `cache-updated` event will trigger a state refresh from the memory cache, causing `useActivityFeed`'s `useMemo` to recompute with the latest data.

