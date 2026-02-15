

# Performance Optimization: Faster Client Page and Home Screen

## Problem

### Client Detail Page (3-5 seconds to load)
1. `useEventDetails` makes TWO sequential Google Sheets API calls: first `refreshClientVendorData`, then `getClientEventDetails` -- this alone takes 2-4 seconds
2. `useClientContactDetails` makes another Google Sheets API call on mount
3. `useFreelancerAssignments` fetches from Supabase + freelancer list
4. All three hooks fire simultaneously, hitting the API hard

### Home Screen (1-3 seconds)
1. `isCachePopulated()` check adds a round-trip to Supabase before data loads
2. `TodayEventsHero` fetches bulk event details from Google Sheets AND freelancer assignments separately
3. Activity feed parsing runs on every render of both client datasets

## Solution

### 1. Client Detail Page: Use Supabase Cache for Event Details (biggest win)

The `event_details_cache` table already exists in Supabase with all the venue/parlour/timing data. Instead of calling Google Sheets every time a client page opens, read from the cache first and show data instantly.

**Changes:**
- Modify `useEventDetails` to read from `event_details_cache` table first (instant, ~50ms)
- Remove the blocking `refreshClientVendorData` call from mount -- move it to a background refresh or manual sync only
- Only fall back to Google Sheets if cache is empty for this client

### 2. Client Detail Page: Lazy-Load Contact Details

Contact details are only shown in the "Contact" tab section, not on the default "Dashboard" view. Defer loading until the user actually clicks on that section.

**Changes:**
- Add a `skipInitialFetch` option to `useClientContactDetails`
- Only trigger fetch when `activeSection === 'contact'` in ClientDetail page

### 3. Home Screen: Skip `isCachePopulated` When Memory Cache Exists

The memory cache check already handles the instant path, but `isCachePopulated` still runs a Supabase COUNT query even when memory is loaded. This is redundant.

**Changes:**
- In `useCachedData` and `useBookedCachedData`, ensure the memory cache path returns immediately without any async calls

### 4. Home Screen: Cache Bulk Event Details in Session Storage

`TodayEventsHero` fetches event details from Google Sheets on every mount. Cache the results in sessionStorage so subsequent visits are instant.

**Changes:**
- Add sessionStorage caching to `useBulkEventDetails` (similar to how crew assignments are already cached)

### 5. Home Screen: Read Event Details from Supabase Cache Instead of Sheets

Since `event_details_cache` table exists, `useBulkEventDetails` should read directly from Supabase instead of calling Google Sheets.

**Changes:**
- Replace the `getBulkEventDetails` Google Sheets call with a direct Supabase query on `event_details_cache` table
- This eliminates the slowest API call on the home screen

## Technical Details

### File Changes

**`src/hooks/useEventDetails.ts`**
- Add Supabase cache-first loading from `event_details_cache` table
- Move `refreshClientVendorData` to only run on manual sync or after 5 minutes
- Show cached data instantly, then optionally refresh in background

**`src/hooks/useClientContactDetails.ts`**
- Add `enabled` parameter (default: true for backward compat)
- When `enabled=false`, skip the initial fetch

**`src/pages/ClientDetail.tsx`**
- Pass `enabled={activeSection === 'contact'}` to `useClientContactDetails`
- Contact data loads only when user navigates to that tab

**`src/hooks/useBulkEventDetails.ts`**
- Replace Google Sheets API call with direct Supabase query on `event_details_cache`
- Add sessionStorage caching for instant subsequent loads

**`src/hooks/useCachedData.ts` and `src/hooks/useBookedCachedData.ts`**
- Already optimized with memory cache -- verify the early return path has no async calls leaking through

### Expected Performance Improvements

| Screen | Before | After |
|--------|--------|-------|
| Client Detail Page | 3-5s (3 API calls) | Under 500ms (cache reads) |
| Home Screen Events | 2-3s (Sheets API) | Under 200ms (Supabase query) |
| Home Screen Initial | 1-2s (cache check + load) | Under 100ms (memory cache) |

### Safety

- Google Sheets remains the source of truth -- no write paths change
- All cache reads are safe fallbacks; if cache is empty, original API calls still work
- Existing sync/refresh buttons continue to work exactly as before

