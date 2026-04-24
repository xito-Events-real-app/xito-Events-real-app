# Photo Edit Tracker — Photographer-based rows + Photo file expander

Two changes to make the Photo Edit Tracker behave like a true photo workflow:

## 1. Expandable row should show PHOTOS, not videos

The dropdown/expander on each row currently re-uses `FileDetailsExpander`, which is hard-coded to video roles (VB/VG/EV/DRONE/FPV/IPHONE) and shows "Video Size".

**New component**: `src/components/photo-edit/PhotoFileDetailsExpander.tsx` — a dedicated photo version that:
- Filters `files_management` to photo roles only: **PB, PG, EP**
- Shows "**Photo Size: X GB**" instead of "Video Size"
- Lists photographers in a table with the same columns (Role, Freelancer, Side, Card, Size, Format, Copied By, 1x/2x/3x/☁, Path)
- "ALL VIDEO FILES COPIED" → "ALL PHOTO FILES COPIED"

Swap `FileDetailsExpander` → `PhotoFileDetailsExpander` in:
- `DesktopPhotoEditTracker.tsx` (line 699)
- `PhotoPipelineView.tsx` (line 343)
- `MobilePhotoEditTracker.tsx` (if used there)

## 2. Queue rows must be per-photographer (only for "All Photos")

Today: photo tracker creates **1 row per enabled photo deliverable** (e.g. one "All Photos" row per event).

New behavior: **only the "All Photos" deliverable** generates per-photographer rows. "Selected Photos" and "Insta Post" continue to be created via the existing selection button in the deliverables module — the tracker does **not** auto-generate rows for them.

### New row generation logic (rewrite `ensurePhotoEditRows` + `syncPhotoRowsWithDeliverables`)

For each booked event past today:
1. Read `freelancer_assignments` for that event → grab `photographer_bride`, `photographer_groom`, `extra_photographer` (each may be empty / comma-separated for multiple EPs).
2. For each non-empty photographer, generate **one "All Photos" tracker row** with:
   - `edit_type` = `"All Photos"`
   - `reference` = photographer name
   - New persisted fields (see DB migration):
     - `photographer_name` text
     - `photographer_role` text — one of `PB` / `PG` / `EP`
     - `photographer_side` text — `BRIDE SIDE`, `GROOM SIDE`, or `` for EP
3. **Skip** any other deliverable types (`selected_photos`, `insta_post`) — those rows are created by the deliverables selection workflow as they are today.
4. Composite uniqueness key for "already exists" check becomes:
   `registered_date_time_ad || event_name || edit_type || photographer_role || photographer_name`

### Sync behavior
`syncPhotoRowsWithDeliverables` is rewritten so:
- "All Photos" rows are soft-deleted when the corresponding photographer is removed from `freelancer_assignments` (e.g. PB cleared → that row goes away).
- Non-"All Photos" rows (selected/insta) are left untouched — they remain owned by the deliverables selection workflow.

## 3. New columns in the Queue table (and other stages)

In `DesktopPhotoEditTracker.tsx` `PhotoEditTable`, add **two new columns immediately after "Event"**:

| Photographer | Role |
|---|---|
| Lajja Uprety | Bride Side (PB) |

- **Photographer** column: shows `row.photographerName` (falls back to `row.reference`).
- **Role** column: colored pill:
  - **PB** → `Bride Side` — pink/rose pill (`bg-pink-100 text-pink-800 border-pink-300`)
  - **PG** → `Groom Side` — sky/blue pill (`bg-sky-100 text-sky-800 border-sky-300`)
  - **EP** → `Extra` — amber pill (`bg-amber-100 text-amber-800 border-amber-300`)

Non-"All Photos" rows (selected/insta) won't have a photographer → both cells render `—`.

Mirror the same data in `MobilePhotoEditTracker.tsx` cards (small badge under event name) and `PhotoPipelineView.tsx` cards.

## 4. Filters

Add new filter dropdowns next to the existing client/edit-type/year/month/editor filters:
- **Photographer** filter (distinct names from current rows).
- **Side / Role** filter with three colored chips: Bride Side / Groom Side / Extra. Same colors as the column pill.

Wire both into `applyFiltersAndSort`.

## 5. Database migration

```sql
ALTER TABLE public.photo_edit_tracker
  ADD COLUMN IF NOT EXISTS photographer_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS photographer_role text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS photographer_side text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_photo_edit_tracker_photographer
  ON public.photo_edit_tracker (photographer_role, photographer_name);
```

Existing auto-generated "All Photos" rows are soft-deleted (`UPDATE photo_edit_tracker SET deleted = true WHERE edit_type ILIKE 'All Photos'`) so the new logic regenerates them cleanly per-photographer on next load. Selected-photos / insta-post rows are preserved.

## Files touched

- New: `src/components/photo-edit/PhotoFileDetailsExpander.tsx`
- Edited: `src/lib/photo-edit-api.ts` (rewrite ensure/sync, add fields, change composite key, restrict generation to "All Photos")
- Edited: `src/hooks/usePhotoEditTracker.ts` (expose new fields on `PhotoEditRow`)
- Edited: `src/components/photo-edit/DesktopPhotoEditTracker.tsx` (columns, filters, expander swap, color pills)
- Edited: `src/components/photo-edit/MobilePhotoEditTracker.tsx` (badge under event)
- Edited: `src/components/photo-edit/PhotoPipelineView.tsx` (badge + expander swap)
- Migration: add 3 columns + soft-delete existing "All Photos" rows
