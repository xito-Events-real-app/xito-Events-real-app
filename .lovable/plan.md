

## Fix: Duplicate Rows, Future Events in Queue, and Merge Key

### Problems identified

1. **Duplicate DB rows**: BRIDE MEHNDI has 2 Highlights (should be 1), GROOM HALDI has 2 Full Videos + 2 Highlights (should be 1+1). Total 3 extra rows from race conditions in `ensureVideoEditRows`.

2. **POST SHOOT in queue**: This event is on 2026-04-13 (future) but has a tracker row. The `full_video` is explicitly disabled, but `highlights` has no record so default-ON logic created a row. The event date in the tracker row appears incorrect.

3. **Merge key ignores subEventName**: Current key is `registeredDateTimeAD||eventName`, so BRIDE MEHNDI and GROOM HALDI (both under same event "BRIDE MEHNDI & GROOM HALDI") can't be independently merged. Need key to be `registeredDateTimeAD||eventName||subEventName`.

### Fixes

**1. Database cleanup migration**
- Soft-delete the 3 duplicate rows (keep earliest ID per unique combo of registered_date_time_ad, event_name, sub_event_name, edit_type)
- Soft-delete POST SHOOT row (future event)
- Add a unique partial index on `(registered_date_time_ad, event_name, sub_event_name, edit_type)` WHERE `deleted = false` to prevent future duplicates

**2. `src/lib/video-edit-api.ts` — Prevent duplicates + fix future events**
- In `ensureVideoEditRows()`: change `.insert(batch)` to `.upsert(batch, { onConflict: ... })` or add `ON CONFLICT DO NOTHING` behavior. Since we're adding a unique index, inserts of duplicates will be caught.
- Actually, wrap inserts in try/catch per batch to gracefully handle unique constraint violations.
- The existing `lte("event_date_ad", today)` filter on `event_details_cache` should already prevent future events. The POST SHOOT row likely snuck in from a previous bug or wrong date. The unique index + cleanup prevents recurrence.

**3. `src/hooks/useVideoEditTracker.ts` — Fix merge key to include subEventName**
- `makeMergeKey()`: change to `${row.registeredDateTimeAD}||${row.eventName}||${row.subEventName || ''}`
- This ensures BRIDE MEHNDI Full Video merges only with BRIDE MEHNDI Highlights (not GROOM HALDI's)
- Display: when merged and subEventName exists, show `"BRIDE MEHNDI: Full Video + Highlights"`

### Files changed
1. Database migration — cleanup duplicates + unique index
2. `src/lib/video-edit-api.ts` — graceful duplicate handling in inserts
3. `src/hooks/useVideoEditTracker.ts` — merge key includes subEventName

