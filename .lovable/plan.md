Plan to fix the All Clients expanded-mode venue/location issue safely ( also check all the clients )

What I found

- Funny Bhusan has multiple events with the same event name: `PRE+RECEPTION`.
- In `freelancer_assignments`, Baisakh 17 is `PRE+RECEPTION` with AD date `2026-04-30`.
- In `event_details_cache`, Baisakh 17 has venue data correctly saved:
  - Venue: `MAJESTIC GRAND`
  - Area: `EKANTAKUNA`
  - City: `LALITPUR`
  - Map: `https://share.google/ou66f0JCaBgYj2cwN`
- The bug is in `AllClientsCrewTable.tsx`: expanded mode fetches event details using only:
  - `registered_date_time_ad`
  - `event_name`
- Because Funny Bhusan has two `PRE+RECEPTION` rows, the lookup is ambiguous. It can fetch the wrong row, no row, or fail silently instead of matching the Baisakh 17 event specifically.

Fix approach

1. Update the expanded-row detail lookup in `AllClientsCrewTable.tsx`
  - Replace event-name-only lookup with a strict identity lookup:
    - `registered_date_time_ad`
    - `event_date_ad`
    - normalized `event_name`
  - For expand-all, apply the same logic so single expand and expand-all behave identically.
2. Add a safe fallback resolver
  - First try exact match by `registered_date_time_ad + event_date_ad + event_name`.
  - If that fails, fetch all event detail rows for that client and choose the best match by priority:
  1. same `event_date_ad`
  2. same BS year/month/day
  3. normalized event name
  4. event index/date order as last fallback
    is prevents future bugs when an event name repeats, casing differs, or spacing differs.
3. Select all fields needed by the expanded logistics panel
  - Include existing venue/parlour fields.
  - Also include fields currently mapped but not fetched consistently, such as:
    - `event_name`, `event_year`, `event_month`, `event_day`, `event_date_ad`, `event_index`
    - `bride_start_time`, `bride_end_time`, `groom_start_time`, `groom_end_time`
    - `do_groom_come_in_mehndi`, `guest_count`
  - This keeps the expanded card complete and avoids missing values later.
4. Make cache keys collision-proof
  - Change expanded detail cache keys from:
    - `registeredDateTimeAD__event`
  - To:
    - `registeredDateTimeAD__eventDateAD__normalizedEventName`
  - This ensures duplicate names like multiple `PRE+RECEPTION` events never overwrite each other.
5. Keep visibility/settings behavior unchanged
  - Venue, bride, groom, and parlour visibility settings will remain the same.
  - Only the lookup/matching logic changes.
6. Verify with the exact reported case
  - Confirm Funny Bhusan Baisakh 17 expanded row displays:
    - `MAJESTIC GRAND`
    - `EKANTAKUNA`
    - `LALITPUR`
    - map link
  - Confirm Funny Bhusan Baisakh 19 still shows its own separate venue, not Baisakh 17’s venue.
  - Confirm expand-all uses the same correct matching.

Technical files to update

- `src/components/suite/AllClientsCrewTable.tsx`

No database schema change needed

- The data is already correctly stored in the database.
- This is an app-side matching/caching bug, not a table structure problem.

Safety

- No changes to event saving, client details, crew assignments, public crew portal, or database structure.
- The fix only makes All Clients expanded-mode read the correct event detail row for the exact event date.