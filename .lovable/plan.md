

# Fix: Upcoming Events Details Not Loading

## Root Cause

The `event_details_cache` table in the database is **completely empty** (0 rows). The `useBulkEventDetails` hook was updated to read directly from this Supabase table, but **no fallback to Google Sheets was added** when the cache is empty. This breaks the "Iron Rule" from the architecture plan.

## The Fix

Update `src/hooks/useBulkEventDetails.ts` to follow the same cache-first pattern used everywhere else:

1. Query `event_details_cache` from Supabase
2. If rows are returned, use them (instant)
3. **If 0 rows returned, fall back to the original `getBulkEventDetails()` Google Sheets API call**
4. Trigger a background `sync-all-data` with `pull-event-details` to populate the cache for next time

## Technical Details

**File to modify:** `src/hooks/useBulkEventDetails.ts`

The current flow:
```text
Query event_details_cache -> 0 rows -> show nothing (BUG)
```

The fixed flow:
```text
Query event_details_cache -> has rows -> return instantly
                          -> 0 rows  -> call getBulkEventDetails() from sheets-api (original behavior)
                                     -> trigger background sync-all-data pull-event-details
```

The `getBulkEventDetails` function in `src/lib/sheets-api.ts` already exists and works -- it was the original data source before the cache-first migration. We just need to restore it as the fallback.

No other files need to change. The freelancer/crew assignments already load separately via `getAllFreelancerAssignments()` which has its own working data path.

