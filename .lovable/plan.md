

## Fix: Shakti Neupane File Data Corruption + Missing Events

### What happened
1. **36 duplicate POST SHOOT rows** exist (should be ~4 based on assignment). Multiple batches were created at different timestamps today, indicating the dedup mechanism failed — likely due to concurrent `ensureFileRowsForMonth` calls from multiple components or realtime triggers.
2. **BRIDE MEHNDI & GROOM HALDI** and **WEDDING BOTH SIDES** events have **zero file rows** — these are in month 11 (Falgun) and were never generated because the user hasn't viewed that month.
3. The POST SHOOT event has `event_date_ad: 2026-03-**` (date TBD), so the `**` filter in `ensureFileRowsForMonth` correctly skips it. But somehow rows got created — likely from a race condition where the existing-keys query returned empty before prior inserts completed.

### Data fix (using insert tool)
1. **Delete duplicate POST SHOOT rows** — for each unique `freelancer_type + freelancer_name` combo, keep only 1 row and soft-delete the rest
2. **Verify PRE+RECEPTION rows** are correct (6 rows — looks fine)

### Code fix — `src/lib/files-api.ts`
The `ensureFileRowsForMonth` lock uses a module-level Promise, but if the page reloads or multiple components call it simultaneously before the first call's inserts complete, duplicates are created.

**Fix**: After building `newRows`, do a second dedup query right before inserting — check if any of the composite keys already exist in the DB. This prevents race-condition duplicates:

```
// Before inserting, re-check for any rows that appeared since our initial query
const recheckKeys = newRows.map(r => 
  `${r.registered_date_time_ad}||${r.event_name}||${r.freelancer_type}||${r.freelancer_name}`
);
// Query existing again and filter out any that now exist
```

Also add `card_label` to the dedup key to prevent issues with duplicated cards.

### Files changed
1. `src/lib/files-api.ts` — add pre-insert dedup recheck in `ensureFileRowsForMonth`
2. Data cleanup via insert tool (DELETE duplicates for Shakti)

