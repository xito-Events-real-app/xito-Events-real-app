


## Video Edit Tracker — Supabase-First Migration (COMPLETED)

### What was done
1. Created `video_edit_tracker` table in Supabase with realtime enabled
2. Rewrote `src/lib/video-edit-api.ts` — Supabase-first with auto-generation from `event_details_cache` + `client_deliverables`
3. Created `src/lib/video-edit-push-scheduler.ts` — 3-second debounced push to Sheets
4. Added `pushVideoEditsToSheet` action in `google-sheets` edge function — one-way Supabase → Sheets sync
5. Rewrote `src/hooks/useVideoEditTracker.ts` — auto-ensures rows on mount, no manual generate
6. Updated Desktop + Mobile UI — removed Refresh/Generate buttons, switched from `rowNumber` to `id`

### Architecture
- Source of truth: `video_edit_tracker` Supabase table
- Auto-generation: On page load, scans `event_details_cache` for past/today events of BOOKED clients
- Deduplication: composite key `registered_date_time_ad + event_name + sub_event_name + edit_type`
- Sheet sync: One-way push (Supabase → Google Sheets) via 3-second debounced scheduler
