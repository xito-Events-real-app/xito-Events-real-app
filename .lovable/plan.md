
Goal: make YouTube video details come from the client/event/edit selection made during upload, not from the YouTube title.

What’s actually wrong
- The upload flow already knows the exact client, event, edit type, and tracker row.
- But the metadata viewer in `src/components/suite/YouTubeDashboard.tsx` still relies mainly on:
  1. `video_edit_tracker.youtube_link` string matching
  2. fragile title parsing (`BRIDE & GROOM ...`)
- For titles like `BARSHA MAM 6 MONTHS CELEBRATION HIGHLIGHTS || WEDDING TALES NEPAL`, that fallback parsing does not identify the correct tracker row.
- There is already a `tracker_row_id` column on `youtube_upload_sessions`, but the upload start logic is not saving it. So the app is not using the strongest source of truth it already has.

Implementation plan

1. Save the exact tracker mapping during upload
- In `src/contexts/YouTubeUploadContext.tsx`, include `tracker_row_id` when inserting into `youtube_upload_sessions`.
- Keep writing the final YouTube URL into `video_edit_tracker.youtube_link` after upload success, but preserve clean comma-separated formatting.

2. Make metadata lookup use the upload mapping first
- In `src/components/suite/YouTubeDashboard.tsx`, load recent/completed upload session mappings needed for active videos:
  - `youtube_video_id`
  - `tracker_row_id`
  - `client_name`
  - `event_name`
  - `edit_type`
- Update `findTrackerForVideo()` so the matching order becomes:
  1. Exact video-id match against parsed IDs from `video_edit_tracker.youtube_link`
  2. Upload-session match by `youtube_video_id -> tracker_row_id`
  3. Upload-session fallback by `client_name + event_name + edit_type`
  4. Existing title parsing only as legacy fallback

3. Stop using loose string matching for YouTube links
- Replace `youtube_link.includes(videoId)` with exact ID extraction from all stored links.
- This avoids false matches and supports rows that contain multiple uploaded video URLs.

4. Keep old videos working
- Do not remove the current title-based heuristic completely.
- Keep it only for older uploads that were created before `tracker_row_id` started being saved.

Files to update
- `src/contexts/YouTubeUploadContext.tsx`
- `src/components/suite/YouTubeDashboard.tsx`

Technical details
- Add a small helper in `YouTubeDashboard.tsx` (or shared helper) to parse all video IDs from comma-separated `youtube_link` values.
- Use the upload selection as the authoritative identity for new uploads.
- No database migration is needed because `youtube_upload_sessions.tracker_row_id` already exists.
- No UI redesign is needed; this is a data-resolution fix.

Expected result
- For Barsha’s uploaded video, the details panel will show the correct metadata for that selected client/edit row even if the title is custom.
- Videos should behave like Simran’s Bride Reception videos: date/event age, editor, colorist, timings, type, and status should appear from the linked tracker row.
- Future uploads will no longer depend on the YouTube title format to show details.

Verification
- Upload a video with a custom title that does not follow bride/groom naming.
- Open that exact video in the built-in YouTube dashboard player.
- Confirm the metadata loads from the selected client/event/edit row.
- Re-check an older video that already worked to ensure legacy matching still works.
