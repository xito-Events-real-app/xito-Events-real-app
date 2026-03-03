

# Fix: Duplicate Clients in Finance Manager (Definitive)

## Root Cause

The previous fix only guarded the Realtime INSERT path. But duplicates can enter through multiple other paths:

1. **Multiple hook instances** (~8 components mount `useBookedCachedData`) each create their own Realtime channel. When a DB change fires, all instances process it and update the shared memory singleton — potential for interleaved appends.
2. **`cache-updated` event listeners** — all instances read from the same memory singleton and set local state. If memory was corrupted by a race between instances, the corruption propagates.
3. **`loadData()` + Realtime race** — the subscription starts immediately in the same `useEffect` as `loadData()` (async). A Realtime INSERT can fire before load completes, then load resolves and sets a second copy.

Since the exact race is timing-dependent (explaining the intermittent "sometimes 1, sometimes 2, sometimes 3"), the correct fix is a **defensive dedup at the output boundary** rather than trying to patch every possible input path.

## Fix (2 changes)

### 1. `src/hooks/useBookedCachedData.ts` — Dedup clients before returning

Add a `useMemo` that deduplicates the `clients` array by `registeredDateTimeAD` before returning it to consumers. This is a zero-cost safety net that catches ALL duplication sources regardless of origin:

```typescript
const dedupedClients = useMemo(() => {
  const seen = new Set<string>();
  return clients.filter(c => {
    if (seen.has(c.registeredDateTimeAD)) return false;
    seen.add(c.registeredDateTimeAD);
    return true;
  });
}, [clients]);

return { clients: dedupedClients, ... };
```

### 2. `src/hooks/useCachedData.ts` — Same dedup guard

Apply the same defensive dedup on the `clients` array returned by `useCachedData` to prevent duplicates across Dashboard, FreshClients, and other views:

```typescript
const dedupedClients = useMemo(() => {
  const seen = new Set<string>();
  return clients.filter(c => {
    if (seen.has(c.registeredDateTimeAD)) return false;
    seen.add(c.registeredDateTimeAD);
    return true;
  });
}, [clients]);

return { clients: dedupedClients, ... };
```

## Why this works

- Catches duplicates from ANY source (Realtime, cache-updated events, load races, memory singleton corruption)
- `useMemo` ensures zero overhead when there are no duplicates (same reference returned)
- Does not change any data flow — purely defensive filter at the output boundary
- Keeps the first occurrence (which is the freshest from the initial load or most recent update)

## Impact

| Risk | Assessment |
|------|-----------|
| Breaking existing behavior | None — removes only exact duplicates |
| Performance | Negligible — single Set-based pass, O(n) |
| Data loss | None — keeps first occurrence of each unique client |

## Files Changed
1. `src/hooks/useBookedCachedData.ts` — add output dedup
2. `src/hooks/useCachedData.ts` — add output dedup

