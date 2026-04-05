
Restore the YouTube player details by fixing the regression in the upload-to-tracker refresh flow.

1. Root cause to fix
- The metadata panel in the YouTube player depends on `trackerInfo`, which comes from `allTrackerRows` in `src/components/suite/YouTubeDashboard.tsx`.
- The recent upload fix updates `video_edit_tracker.youtube_link` in `src/contexts/YouTubeUploadContext.tsx`, but `YouTubeDashboard` only loads tracker rows once on open via `loadStats()`.
- Result: newly uploaded videos can appear in the player/recent list, but their updated tracker row is not reloaded yet, so editor/colorist/timing/event/type stay blank.

2. Implementation changes
- In `src/components/suite/YouTubeDashboard.tsx`, add a reactive refresh that runs when upload jobs change from active to completed.
- Re-run `loadStats()` when a YouTube upload finishes so `allTrackerRows` gets the fresh `youtube_link`, `editor`, `colorist`, `stage_history`, and other tracker fields.
- Also clear `trackerInfo` only when there is truly no matching row after refresh, not before the dashboard has had a chance to reload tracker data.
- Keep the existing direct `youtube_link.includes(videoId)` match as the primary source of truth.

3. Small hardening
- Make `handleUploadSuccess()` in `src/contexts/YouTubeUploadContext.tsx` preserve clean `youtube_link` formatting when appending links, so matching stays reliable if a row already had links.
- Do not change the player UI design or remove any existing metadata fields.

4. Expected result
- After an upload completes, opening/playing that video in your YouTube player should again show:
  - Editor
  - Colorist
  - Total/Edit/Actual timing
  - Event age
  - Type
  - Status badge
- Existing older videos should keep working exactly the same.

5. Files to update
- `src/components/suite/YouTubeDashboard.tsx`
- `src/contexts/YouTubeUploadContext.tsx`

6. Verification
- Upload a new video from the dashboard.
- Wait until it shows completed.
- Open that same video in the built-in YouTube player.
- Confirm the metadata block appears immediately without needing a page refresh.
- Re-check one older video too, to confirm nothing regressed.
