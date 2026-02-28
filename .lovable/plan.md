

# Fix Silent Save Failures Across All Modules

## What's Happening

You saved event details for Ashmita, got "Saved" confirmation, and the data went to Google Sheets -- but it never actually saved to the database. The same problem affects crew assignments, crew categories, and vendor edits.

The root cause: the code uses `.update()` which only works on rows that **already exist**. If the initial sync from Sheets never created the row in the database, the update silently does nothing (0 rows affected, no error thrown).

## What Will Be Fixed

| What you save | Where it breaks | Fix |
|---|---|---|
| Event details (venue, parlour, timing) | `useEventDetails.ts` | Switch to upsert |
| Crew assignments (photographer, videographer, etc.) | `freelancer-assignment-cache.ts` | Switch to upsert |
| Required crew categories | `freelancer-assignment-cache.ts` | Switch to upsert |
| Vendor edits | `vendor-api.ts` | Switch to upsert |

## How It Gets Fixed

**1. Event Details (`src/hooks/useEventDetails.ts`)**
- Change `.update()` to `.upsert()` with conflict key `(registered_date_time_ad, event_index)`
- Include identity fields (event name, year, month, day, date AD) from the current event data so new rows can be created
- Add auto-backfill: when loading a client page with zero cached event rows, trigger a one-time sync from Sheets to populate the database, then retry loading

**2. Freelancer Assignments (`src/lib/freelancer-assignment-cache.ts`)**
- `updateAssignmentInCache`: change `.update()` to `.upsert()` with conflict key `(registered_date_time_ad, event, event_date_ad)`
- `updateCategoriesInCache`: same change
- Both need identity fields included in the payload so missing rows get created automatically

**3. Vendor Edits (`src/lib/vendor-api.ts`)**
- Change `.update()` to `.upsert()` with conflict key on `row_number`
- Include `row_number` in the upsert payload

## What This Means For You

- Ashmita's event details will appear on her client page (auto-backfilled from Sheets on first visit)
- Booked clients will show in All Clients crew table (reconciliation pull already added in previous fix)
- Any future client whose data wasn't synced will still save correctly -- no more silent failures
- Existing clients with data already in the database are unaffected (upsert behaves identically to update when the row exists)

## Files to Change

1. `src/hooks/useEventDetails.ts` -- upsert + auto-backfill on empty cache
2. `src/lib/freelancer-assignment-cache.ts` -- upsert for assignments and categories
3. `src/lib/vendor-api.ts` -- upsert for vendor edits

