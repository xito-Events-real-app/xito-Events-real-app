

## Fix: Video Edit Tracker Sorting + Live Deliverable Sync

### Problem 1: Sorting
Rows are sorted only by `event_date_ad`. Full Video and Highlights for the same event can appear scattered. Need secondary sort keys to group same-event rows together.

### Problem 2: Live Updates
When deliverables are added/changed in a client's detail page, the video edit tracker doesn't reflect changes until a full page reload. Need realtime subscription on `client_deliverables` to auto-regenerate and reload rows.

---

### Part 1: Fix sorting — `src/hooks/useVideoEditTracker.ts`

Update `withPriority` to sort by:
1. `eventDateAD` (ascending — oldest first)
2. `registeredDateTimeAD` (group same client)
3. `eventName` (group same event)
4. `editType` with explicit order: Full Video → Highlights → Reel → others

This ensures Full Video and Highlights for the same event always appear consecutively.

### Part 2: Live deliverable sync — `src/hooks/useVideoEditTracker.ts`

Add a Supabase realtime subscription on `client_deliverables` table (video section changes). When an INSERT/UPDATE/DELETE is detected:
1. Re-run `ensureVideoEditRows()` to generate any new rows from newly enabled deliverables
2. Re-load rows from Supabase (silent, no loading spinner)

Also clean up rows for deliverables that were disabled: add a `cleanupDisabledDeliverables()` function in `video-edit-api.ts` that soft-deletes tracker rows whose corresponding deliverable is no longer enabled (only for rows still in QUEUE status — never delete LAB rows).

### Part 3: Cleanup function — `src/lib/video-edit-api.ts`

New `syncWithDeliverables()` function:
- Load all enabled video deliverables for booked clients with past/today events
- Load all QUEUE video_edit_tracker rows
- For each QUEUE row, check if a matching enabled deliverable still exists
- If deliverable was disabled (or default Full Video/Highlights replaced by configured deliverables), soft-delete the tracker row
- This runs after `ensureVideoEditRows()` on each realtime event

### Files changed
1. `src/hooks/useVideoEditTracker.ts` — fix sort order + add realtime subscription on `client_deliverables`
2. `src/lib/video-edit-api.ts` — add `syncWithDeliverables()` cleanup function

