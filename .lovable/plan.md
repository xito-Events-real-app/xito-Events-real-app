

# Fix YouTube Dashboard: Bride/Groom Name Priority in Suggestions + Timing Display

## Problems Identified

1. **Manual link suggestions don't prioritize bride/groom names** - Currently matches generic title words against `client_name` and `event_name`, but doesn't fetch or use bride/groom names from `contact_details_cache` for better matching.

2. **Timings not showing for linked videos** - The `handleManualLink` function sets `trackerInfo` to the original `row` object before the `youtube_link` update, but the `stage_history` field on that row object is correct. The real issue is that timings only display when the `stage_history` has the right entries. For newly linked videos that actually went through the pipeline, the `stage_history` should already have the data. Need to verify the row passed has `stage_history` populated.

3. **Editor change time tracking** - When the editor field changes, there's no record of who edited what and for how long. Need to append editor change entries to `stage_history`.

4. **Timing definitions need clarification in code** - The user's definitions match what exists but the labels in the YouTube dashboard could be clearer.

## Changes

### File 1: `src/components/suite/YouTubeDashboard.tsx`

**Change A: Load bride/groom names for better suggestions**
- On `loadStats`, also fetch `contact_details_cache` (bride_full_name, groom_full_name, registered_date_time_ad)
- Store in a state/ref as a map: `registeredDateTimeAD -> { bride, groom }`
- In `manualLinkSuggestions`, when scoring tracker rows, also check if the bride/groom names from `contact_details_cache` match title words
- Give bride/groom name matches a higher score (e.g., +5 per match) so they appear first
- Display bride & groom names in the suggestion row when available

**Change B: Fix handleManualLink to pass the full updated row**
- After updating the DB, set `trackerInfo` with the updated `youtube_link` field so subsequent lookups work
- The row already contains `stage_history` from `allTrackerRows`, so timings should compute. Verify the `TrackerRow` interface includes `stage_history` (it does, line 64).

**Change C: Show "Time till Export" label instead of "Total Time"**
- Rename "Total Time" to "Time till Export" in the timing display grid for clarity

### File 2: `src/lib/video-edit-api.ts`

**Change D: Record editor changes in stage_history**
- In `updateVideoEditField`, when `field === 'editor'`, fetch current `stage_history` and `editor`, then append `EDITOR_CHANGED_FROM_{old}_TO_{new} [ISO_DATE]` to `stage_history`
- This preserves a record of who worked on the video and when the handoff happened

### File 3: `src/lib/video-edit-time-utils.ts`

**Change E: Add "Time till Export" timing (rename totalTime)**
- The existing `totalTime` (EDIT_ON_PROGRESS → EXPORT_QUEUE) already matches "time till export" - just keep as is, the label change is in the dashboard UI

**Change F: Parse EDITOR_CHANGED entries for per-editor time calculation**
- Add optional `editorTimings` to the return: parse EDITOR_CHANGED entries from stage_history to calculate how long each editor worked
- This is for future display; the core timing computation stays the same

## Technical Details

- `contact_details_cache` query: `SELECT registered_date_time_ad, bride_full_name, groom_full_name FROM contact_details_cache`
- Join to tracker rows via `registered_date_time_ad`
- Bride/groom name matching: extract first significant word from each name, match against video title words
- Editor change history format: `EDITOR_CHANGED_FROM_BARUN_TO_SAUGAT [2026-04-05T10:30:00.000Z]`

## Files to Modify
1. `src/components/suite/YouTubeDashboard.tsx` - Suggestions priority + timing labels
2. `src/lib/video-edit-api.ts` - Editor change tracking in stage_history
3. `src/lib/video-edit-time-utils.ts` - Parse editor change entries (optional enhancement)

