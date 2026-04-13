

# Album Status Tracker in Dashboard

## What gets built
A new **4th card** in the Album Overview dashboard showing the current workflow status of the photos, derived automatically from existing data:

```text
Status Pipeline:
─────────────────────────────────────────────────────────
 1. UPLOADED IN PCLOUD          ← pCloud has photos
 2. UPLOADED FOR ALBUM SELECTION ← Xito Drive has photos
 3. ALBUM SELECTION IN PROGRESS  ← client started selecting (selections > 0 but < 140)
 4. SENT FOR DESIGN (to Nikit)   ← submission exists in album_selection_submissions
─────────────────────────────────────────────────────────
```

## Status logic (computed from existing data)

| Status | Condition |
|--------|-----------|
| **Not Started** | pCloud count = 0 |
| **UPLOADED IN PCLOUD** | pCloud count > 0, Xito count = 0 |
| **UPLOADED FOR ALBUM SELECTION** | Xito count > 0, no album selections yet |
| **ALBUM SELECTION IN PROGRESS** | albumSelections.length > 0 but not all albums full (< 140 each) |
| **SENT FOR DESIGN** | `album_selection_submissions` row exists for this client with `handled` = true or false. Shows "Sent to Nikit" or "Sent to Benjona" from `sent_to` field |

Each completed step shows a green checkmark; the current active step is highlighted; future steps are dimmed.

## Technical changes

### Modified: `src/components/client-detail/AlbumSection.tsx`

1. **Fetch submission data** — On mount, query `album_selection_submissions` for `registered_date_time_ad` to check if client sent WhatsApp and to whom
2. **New state**: `albumSubmission: { sent_to: string; handled: boolean } | null`
3. **Compute status** from: `totalPcloudPhotos`, `totalXitoPhotos`, `albumSelections.length`, `albumProgress` (all full?), and `albumSubmission`
4. **Render 4th card** in the 3-column grid (becomes 2x2 on desktop) — a vertical step indicator showing all 4 stages with:
   - Green check + strikethrough for completed steps
   - Highlighted current step with pulsing dot
   - Gray for pending steps
   - If "SENT FOR DESIGN", show the recipient name (Nikit/Benjona) prominently

### No new files or database changes needed
All data already exists in `album_selection_submissions` and the existing pCloud/Xito/selection counts.

