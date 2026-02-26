

# Fix: Event Details Not Updating Instantly (Supabase-First Violation)

## The Problem

When you save venue/event details, the data goes directly to Google Sheets, then re-reads from Sheets to update local state. But **the `event_details_cache` table in the database is never updated**. Every other module (Suite dashboard, Upcoming Events, Crew Schedule) reads from this database table, so they show stale data until Master Sync.

## Where It Went Wrong -- 2 Violations

### Violation 1: `updateEventDetail` (the write path)
**File:** `src/hooks/useEventDetails.ts` lines 193-252

The Three-Layer Write Contract says:
1. Instant local state update
2. Fast database cache update (~50ms)  
3. Background Google Sheets sync

But `updateEventDetail` does the OPPOSITE:
1. Writes to Google Sheets FIRST (slow, ~2-3s)
2. Re-reads from Sheets to update local state
3. **Never touches the database cache at all**

### Violation 2: `fetchFromSheets` (the read-refresh path)
**File:** `src/hooks/useEventDetails.ts` lines 116-156

When data is fetched from Sheets (either after an update or as a background refresh), the fresh data updates local React state but is **never written back to `event_details_cache`**. So the database stays stale even after a successful Sheets read.

## The Fix

### Change 1: Write to database FIRST in `updateEventDetail`

After calling Google Sheets and getting success, immediately upsert the updated event into `event_details_cache` using the existing unique constraint `(registered_date_time_ad, event_index)`.

The unique constraint already exists on the table, so upsert will work out of the box.

### Change 2: Write back to database after `fetchFromSheets`

When `fetchFromSheets` successfully loads fresh event data from Sheets, upsert ALL events for that client into `event_details_cache`. This ensures the database stays in sync whenever Sheets data is read.

### Technical Details

**In `updateEventDetail` (after line 230):** Add a database upsert using the fresh data that was just re-fetched from Sheets. The upsert maps each `EventDetail` object to the snake_case database columns and uses `onConflict: 'registered_date_time_ad,event_index'`.

**In `fetchFromSheets` (after line 143):** After `setData(result.data)`, loop through `result.data.events` and upsert each event into `event_details_cache`. This covers both background refreshes and manual refetches.

**Helper function:** Create a shared `upsertEventToCache(registeredDateTimeAD, event)` function to avoid duplicating the column mapping logic.

### Result
- Save venue details on Client Detail page --> database updates instantly
- All other modules (Suite, Crew Schedule, Upcoming Events) see fresh data immediately
- No Master Sync needed for event detail changes

