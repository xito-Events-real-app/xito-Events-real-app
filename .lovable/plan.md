

# Fix Slow App Loading with Singleton Data Loader

## Problem
The app takes too long to load because 8-10 components independently query the database on startup before any single query finishes and populates the memory cache. This is NOT caused by the recent sync fixes -- those only changed status update logic, not data loading.

## Root Cause
When memory cache is empty (fresh app open / page refresh), every hook instance of `useCachedData()` and `useBookedCachedData()` independently runs:
1. `isCachePopulated()` -- SELECT count query
2. `loadClientsFromCache()` -- full SELECT * with pagination

With 8-10 components mounting simultaneously, that's 16-20 database round-trips for the exact same data.

## Solution: Singleton Promise Deduplication

### Step 1: Create `src/lib/data-loader-singleton.ts`

A new module that stores a single in-flight Promise per data type. The first caller triggers the actual database fetch; all subsequent callers get the same Promise back.

```text
Current flow (8-10 parallel DB calls):
  Hook 1 --> isCachePopulated() --> loadClientsFromCache() --> DB
  Hook 2 --> isCachePopulated() --> loadClientsFromCache() --> DB
  Hook 3 --> isCachePopulated() --> loadClientsFromCache() --> DB

Fixed flow (1 DB call total):
  Hook 1 --> loadAllClients() --> DB (single query)
  Hook 2 --> loadAllClients() --> same Promise (no DB call)
  Hook 3 --> loadAllClients() --> same Promise (no DB call)
```

Key functions:
- `loadAllClients(): Promise<ClientData[]>` -- checks memory first, deduplicates in-flight fetches, populates memory on completion
- `loadAllBookedClients(): Promise<BookedClientData[]>` -- same pattern for booked data
- `resetLoaderPromises(): void` -- allows manual refresh to bypass deduplication

### Step 2: Update `src/hooks/useCachedData.ts`

Replace the `loadData` function body:
- Remove direct calls to `isCachePopulated()` and `loadClientsFromCache()`
- Call `loadAllClients()` from the singleton instead
- Keep all other logic (dropdowns from IndexedDB, event listeners, queue tracking) unchanged

### Step 3: Update `src/hooks/useBookedCachedData.ts`

Same change:
- Replace `isCachePopulated()` + `loadBookedClientsFromCache()` with `loadAllBookedClients()`
- Keep event listeners and refresh logic unchanged

### Step 4: Update `refreshData` in both hooks

Call `resetLoaderPromises()` before fetching fresh data, so manual refresh bypasses the singleton cache and forces a real database read.

## Expected Result
- Cold start: 1 database query instead of 8-10 (load time drops from several seconds to under 1 second)
- Warm navigation: still 0ms (memory cache unchanged)
- Manual refresh: still works (resets singleton)
- No UI changes, no data shape changes, no breaking changes

## Files Changed
1. **NEW**: `src/lib/data-loader-singleton.ts` -- singleton loader module
2. **EDIT**: `src/hooks/useCachedData.ts` -- use singleton for initial load
3. **EDIT**: `src/hooks/useBookedCachedData.ts` -- use singleton for initial load

