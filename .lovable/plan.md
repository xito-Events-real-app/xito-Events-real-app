

## Video Edit Tracker — Supabase-First with One-Way Sheet Sync

### Overview
Migrate the Video Edit Tracker from sheet-first to Supabase-first architecture (matching files management pattern). Auto-generate rows from past events, read/write Supabase only, push changes to Google Sheets in the background.

### Part 1: Create `video_edit_tracker` table (SQL migration)

New table mirroring the 18-column sheet schema, plus `id`, `synced_to_sheet`, `created_at`, `updated_at`, `deleted`. RLS policy allows all access (matches existing tables). Enable realtime.

### Part 2: Rewrite `src/lib/video-edit-api.ts` — Supabase-first

- **`VideoEditRow`**: Change `rowNumber: number` → `id: string`
- **`getVideoEditRows()`**: Query `video_edit_tracker` where `deleted = false`, ordered by `event_date_ad`
- **`updateVideoEditField(id, field, value)`**: Update row by UUID, set `synced_to_sheet = false`
- **`pushToLab(id)`**: Update `video_edit_status = 'LAB'` + `synced_to_sheet = false`
- **`ensureVideoEditRows()`**: Core auto-generation (same logic as `ensureFileRowsForMonth`):
  1. Query `event_details_cache` where `event_date_ad <= today` and non-empty
  2. Match against `clients_cache` with BOOKED status only
  3. Load `client_deliverables` for video section
  4. For events with deliverables: create rows per configured item (Full Video, Highlights, Reels, etc.)
  5. For events without deliverables: default "Full Video" + "Highlights"
  6. Deduplicate via composite key: `registered_date_time_ad + event_name + sub_event_name + edit_type`
  7. Skip rows already in `video_edit_tracker`
  8. Insert new skeleton rows with status "QUEUE"
- **`pushVideoEditsToSheets()`**: New function calling edge function to sync unsynced rows to sheet
- Remove `generateVideoEditRows()` and `callSheetsFunction`

### Part 3: Create push scheduler `src/lib/video-edit-push-scheduler.ts`

Same pattern as `files-push-scheduler.ts` — 3-second debounced push calling `pushVideoEditsToSheets()`.

### Part 4: Add `pushVideoEditsToSheet` action in edge function

New action in `supabase/functions/google-sheets/index.ts`:
- Read unsynced rows from `video_edit_tracker` via Supabase service role
- Read existing sheet rows, match by composite key
- Update existing rows / append new ones
- Mark rows as `synced_to_sheet = true` after success
- Add to action type union and switch case

### Part 5: Rewrite `src/hooks/useVideoEditTracker.ts`

- On mount: call `ensureVideoEditRows()` then load from Supabase
- Remove `generateRows`, `isGenerating`, `autoGenTriggered`
- `updateField`: optimistic update + Supabase write + schedule push
- `pushToLab`: update status + schedule push
- Priority computed client-side (sort by `event_date_ad` ascending)
- Queue: `video_edit_status = QUEUE` and `event_date_ad <= today`
- Lab: `video_edit_status = LAB`

### Part 6: Update UI components

**`DesktopVideoEditTracker.tsx`**:
- Remove "Refresh" and "Generate Rows" buttons
- Change all `row.rowNumber` → `row.id`
- Keep urgency, editor, push to lab, notes, songs

**`MobileVideoEditTracker.tsx`**:
- Same changes — remove buttons, use `row.id`

### Files changed
1. **SQL migration** — create `video_edit_tracker` table + realtime
2. **`src/lib/video-edit-api.ts`** — full rewrite to Supabase-first + auto-generation
3. **`src/lib/video-edit-push-scheduler.ts`** — new file (3-second debounced push)
4. **`supabase/functions/google-sheets/index.ts`** — add `pushVideoEditsToSheet` action
5. **`src/hooks/useVideoEditTracker.ts`** — rewrite with auto-generation on mount
6. **`src/components/video-edit/DesktopVideoEditTracker.tsx`** — remove buttons, use `id`
7. **`src/components/video-edit/MobileVideoEditTracker.tsx`** — remove buttons, use `id`

