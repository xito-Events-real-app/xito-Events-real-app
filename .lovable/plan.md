Plan to fix the deliverables-to-photo-tracker mistake:

## What will change

1. Keep current **All Photos** behavior
   - All Photos stays photographer-based from freelancer assignments.
   - Example: one event with PB, PG, EP creates 3 All Photos rows.

2. Add **Selected Photos** tracker rows from deliverables switches
   - When **Selected Photos** is enabled in Deliverables, only photographers whose switch is ON will create rows in Photo Edit Tracker.
   - Each selected photographer creates one row:
     - `edit_type`: `Selected Photos`
     - `photographer_name`: selected photographer name
     - `photographer_role`: PB / PG / EP
     - `photographer_side`: Bride Side / Groom Side / Extra
     - `reference`: photographer note if available, otherwise photographer name
   - If a photographer switch is turned OFF later, only that matching QUEUE row will be soft-deleted.

3. Add **Insta Post** tracker rows from deliverables quantity + names
   - When **Insta Posts** is enabled in Deliverables, the number of rows will follow the Insta Post quantity.
   - Each named post creates one tracker row:
     - `edit_type`: `Insta Post`
     - `reference`: the Insta Post name, e.g. `Bride Entry`, `Ring Ceremony`, etc.
     - no photographer role unless the deliverable stores one later
   - If the quantity is reduced or a name changes, stale QUEUE rows will be soft-deleted and new needed rows will be created.

4. Update sync logic safely
   - `ensurePhotoEditRows()` will generate:
     - All Photos from assigned photographers
     - Selected Photos from enabled photographer toggles
     - Insta Post from enabled quantity/names
   - `syncPhotoRowsWithDeliverables()` will clean QUEUE rows that no longer match current deliverables.
   - Rows already moved past QUEUE will not be deleted automatically, so in-progress work is protected.

## Technical details

- Read `client_deliverables` rows where `section = 'photos'` and type is `selected_photos` or `insta_post`.
- Parse `photographer_toggles` JSON for Selected Photos.
- Parse `photographer_notes` JSON for Selected Photos row reference/notes.
- Parse `item_names` split by `|||` for Insta Post names.
- Reuse the existing composite key:

```text
registered_date_time_ad || event_name || edit_type || photographer_role || photographer_name/reference
```

- For Insta Posts, use a deterministic key based on the post name/index so multiple insta rows can exist per event.
- No new database columns are needed; existing `photographer_name`, `photographer_role`, `photographer_side`, and `reference` are enough.

## Files to update

- `src/lib/photo-edit-api.ts`
  - Extend row generation and cleanup logic.
- `src/components/client-detail/DeliverablesSection.tsx`
  - Improve photographer parsing for comma-separated EP names if needed, so Selected Photos toggles map correctly.

## Expected result

- All Photos: rows come from all assigned photographers.
- Selected Photos: rows come only from photographers switched ON inside Deliverables.
- Insta Posts: rows come from the number and names entered inside Deliverables.
- Photo Edit Tracker will match how Deliverables is actually configured.