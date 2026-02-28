

# Global Real-Time Synchronization for All Core Tables

## What This Does
When a Manager changes a client status on their phone, the Desktop dashboard moves that client card instantly -- no refresh, no delay. Same for booked client updates, event detail changes, and crew assignments (already live).

## Changes

### 1. Database Migration
Enable realtime on `clients_cache` and `event_details_cache`. (freelancer_assignments is already enabled; dropdowns_cache changes too rarely to warrant a live socket.)

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients_cache, public.event_details_cache;
```

### 2. Add realtime subscription to `useCachedData` hook
**File:** `src/hooks/useCachedData.ts`

- Import `supabase` and the `rowToClientData` mapper (needs to be exported from `clients-supabase-cache.ts`).
- In the mount `useEffect`, subscribe to `postgres_changes` on `clients_cache` for `INSERT`, `UPDATE`, `DELETE`.
- On `UPDATE`: map `payload.new` through `rowToClientData`, then `setClients(prev => prev.map(c => c.registeredDateTimeAD === mapped.registeredDateTimeAD ? mapped : c))`. Also update memory cache.
- On `INSERT`: append the mapped row. Also update memory cache.
- On `DELETE`: filter out by `registered_date_time_ad`. Also update memory cache.
- Add a `localUpdateTimestamps` ref (same anti-flicker pattern as AllClientsCrewTable) -- skip patches where `updated_at` was generated locally within the last 2 seconds.
- Cleanup: `supabase.removeChannel(channel)` in the effect return.

### 3. Add realtime subscription to `useBookedCachedData` hook
**File:** `src/hooks/useBookedCachedData.ts`

- Same pattern as above, but filter the channel to only `sheet_source = 'booked'` rows using the realtime filter: `filter: 'sheet_source=eq.booked'`.
- Map through `rowToBookedClientData` (also needs export).
- Match by `registeredDateTimeAD` for updates, append for inserts, filter for deletes.
- Same anti-flicker guard with `localUpdateTimestamps`.

### 4. Export row mappers from `clients-supabase-cache.ts`
**File:** `src/lib/clients-supabase-cache.ts`

- Change `function rowToClientData` to `export function rowToClientData`
- Change `function rowToBookedClientData` to `export function rowToBookedClientData`

### 5. Keep existing `cache-updated` event listeners
The window-based `cache-updated` events are still needed for same-tab communication (e.g., when `updateClient()` is called in `useCachedData`, other components on the same page need to know). Realtime handles cross-device; events handle cross-component on the same device. Both coexist safely since the anti-flicker guard prevents double-patches.

## What stays unchanged
- `AllClientsCrewTable.tsx` -- already has realtime on `freelancer_assignments` (done in previous task)
- The `cache-updated` window events -- still needed for same-tab reactivity
- The 3-second debounced push to Google Sheets
- All optimistic local update flows
- `dropdowns_cache` -- rarely changes, not worth a live socket

## Technical Details

**Anti-flicker pattern (reused from crew table):**
```typescript
const localUpdateTimestamps = useRef<Set<string>>(new Set());

// In updateClient(), before writing to DB:
const ts = new Date().toISOString();
localUpdateTimestamps.current.add(ts);
setTimeout(() => localUpdateTimestamps.current.delete(ts), 2000);

// In realtime handler:
if (row.updated_at && localUpdateTimestamps.current.has(row.updated_at)) return;
```

**Realtime channel for clients_cache:**
```typescript
const channel = supabase
  .channel('clients-cache-realtime')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'clients_cache' },
    (payload) => {
      const row = payload.new as any;
      if (row?.updated_at && localUpdateTimestamps.current.has(row.updated_at)) return;
      // ... map and patch state
    }
  )
  .subscribe();
```

**Realtime channel for booked clients (filtered):**
```typescript
const channel = supabase
  .channel('booked-clients-realtime')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'clients_cache', filter: 'sheet_source=eq.booked' },
    (payload) => { /* map and patch */ }
  )
  .subscribe();
```

## Files to modify
1. New migration SQL (1 line)
2. `src/lib/clients-supabase-cache.ts` -- export 2 existing functions
3. `src/hooks/useCachedData.ts` -- add realtime channel + anti-flicker
4. `src/hooks/useBookedCachedData.ts` -- add realtime channel + anti-flicker

