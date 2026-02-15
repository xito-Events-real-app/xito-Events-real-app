
# Superfast Module Loading: In-Memory Singleton Cache

## Problem
Every time you navigate between modules (Dashboard, Fresh Clients, Booked Clients, Finance, etc.), each page remounts and calls `useCachedData()` which queries Supabase again. Even though Supabase is fast (~50ms), the round-trip + React re-render creates a visible 1-2 second loading delay on every module switch.

## Solution: In-Memory Singleton Store
Load client data from Supabase **once** into a JavaScript memory variable. All subsequent module navigations read from RAM (0ms) instead of making network calls.

```text
Current (slow):
  Open Dashboard  -> Supabase query (~100ms) -> render
  Open Fresh      -> Supabase query (~100ms) -> render  
  Open Booked     -> Supabase query (~100ms) -> render
  Open Finance    -> Supabase query (~100ms) -> render

New (instant):
  App boot        -> Supabase query (~100ms) -> store in memory
  Open Dashboard  -> read from memory (0ms) -> render
  Open Fresh      -> read from memory (0ms) -> render
  Open Booked     -> read from memory (0ms) -> render
  Open Finance    -> read from memory (0ms) -> render
```

## What Changes

### 1. New file: `src/lib/memory-cache.ts`
A simple singleton store that holds clients and dropdowns in memory:
- `getMemoryClients()` / `setMemoryClients()` - instant read/write
- `getMemoryDropdowns()` / `setMemoryDropdowns()` 
- `isMemoryLoaded()` - check if data is already in RAM
- All module hooks read from this first (0ms), only fall back to Supabase if empty

### 2. Modified: `src/hooks/useCachedData.ts`
- On mount: check memory cache first (instant) before checking Supabase
- After any Supabase load, store results in memory cache
- After any refresh, update memory cache
- Removes the per-mount Supabase round-trip for repeat navigations

### 3. Modified: `src/hooks/useBookedCachedData.ts`
- Same pattern: read from memory-cached booked clients first
- Falls back to Supabase only if memory is empty (first load)

### 4. Modified: `src/lib/clients-supabase-cache.ts`
- `loadClientsFromCache()` and `loadBookedClientsFromCache()` check memory first
- After loading from Supabase, populate the memory cache automatically

## Technical Details

The memory cache is a plain module-level variable (not React state), so it persists across route navigations without re-renders. It gets populated on first load and updated whenever a sync/refresh happens. This is the same pattern used by high-performance SPAs to eliminate unnecessary network calls during navigation.

### Files Summary

| Action | File |
|--------|------|
| Create | `src/lib/memory-cache.ts` |
| Modify | `src/hooks/useCachedData.ts` |
| Modify | `src/hooks/useBookedCachedData.ts` |
| Modify | `src/lib/clients-supabase-cache.ts` |

### Performance Impact
- Module switching: from ~1-2 seconds to **instant** (0ms)
- First app load: unchanged (still ~100ms from Supabase cache)
- Memory usage: minimal (~200KB for 100 clients)
