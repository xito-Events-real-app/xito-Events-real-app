

# Fix: Breaking News Not Updating in Real-Time

## Root Cause

The Breaking News feed uses `useActivityFeed` which internally calls `useCachedData()` and `useBookedCachedData()`. These hooks listen for `cache-updated` events with types `'clients'` and `'booked-clients'` respectively.

However, most parts of the app fire **`'clients-invalidate'`** and **`'booked-clients-invalidate'`** events when data changes. These `-invalidate` event types are **explicitly ignored** by both hooks (comments on lines 189 and 149 say "REMOVED: clients-invalidate listener -- no more Sheets pulls").

This means:
- **Refresh News button** fires `clients-invalidate` → ignored → nothing happens
- **HandlerActivitySection refresh** fires `clients-invalidate` → ignored
- **QuickAdd** fires `clients-invalidate` → ignored
- **Client deletion** fires `clients-invalidate` → ignored
- **Payment/booking flow** fires `booked-clients-invalidate` → ignored

The hooks DO have Supabase Realtime subscriptions, but those only fire when the **database row** actually changes. For actions happening in the same browser tab, the local state update only affects the hook instance that called `updateClient()`, not the news feed's separate instance. The `notifyCacheUpdate('clients')` call (without `-invalidate`) does work, but many code paths use the invalidate variant instead.

## Fix (2 files)

### 1. `src/hooks/useCachedData.ts` -- Re-add `clients-invalidate` listener

When `clients-invalidate` is received, re-read from Supabase (not Sheets). This is the same as calling `refreshData()` but lighter -- just re-read from the memory singleton or do a fresh database pull.

```typescript
// In the cache-updated event listener, add handling for 'clients-invalidate':
if (e.detail.type === 'clients-invalidate') {
  const memClients = getMemoryClients();
  if (memClients) {
    setTimeout(() => setClients([...memClients]), 0);
  }
}
```

### 2. `src/hooks/useBookedCachedData.ts` -- Re-add `booked-clients-invalidate` listener

Same pattern:

```typescript
// In the cache-updated event listener, add handling for 'booked-clients-invalidate':
if (detail?.type === 'booked-clients-invalidate') {
  const memBooked = getMemoryBookedClients();
  if (memBooked) {
    setTimeout(() => {
      setClients([...memBooked]);
      setLastSyncedAt(new Date());
    }, 0);
  }
}
```

### Why This Is Safe

The old invalidate listeners were removed because they triggered Google Sheets pulls. These new handlers only read from the **in-memory cache** (which is already populated from Supabase). No Sheets calls are made. The `setTimeout(..., 0)` prevents React render-phase collisions per the existing pattern.

