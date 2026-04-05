

# Fix YouTube Upload Issues + Complete Timing Display

## Issues Identified

### Issue 1: Build Error — `date-fns` corrupted
The `date-fns@3.6.0` package has corrupted internal module references. Fix: pin to `date-fns@4.1.0` or reinstall with `--force`.

### Issue 2: Upload shows "failed" despite successful upload
In `YouTubeUploadContext.tsx`, the `xhr.onload` handler (line 333) sometimes gets a non-2xx status (e.g., 503) from YouTube even after all bytes are sent. The `retryStatusCheck` only retries twice. Additionally, the `checkUploadStatus` function sends a `PUT` with `Content-Range: bytes */{size}` but YouTube may return a 200/201 with the video data on these checks — the parsing works but needs more retries and a longer wait window.

**Fix**: Add a 3rd retry with 10s delay. Also handle the case where `xhr.status` is 0 (network timeout treated as error) in `xhr.onerror` — lower the threshold from 99% to 95%.

### Issue 3: Video details not found after upload (asks to "Link to tracker")
After upload completes, `handleUploadSuccess` writes the `youtube_link` to `video_edit_tracker`. But the dashboard's `allTrackerRows` state is stale — it was loaded on open and only refreshes via `loadStats()` when a job completes. The problem: `loadStats()` IS called (line 603), but `findTrackerForVideo` runs based on `allTrackerRows` dependency, and the stale rows don't have the newly-written `youtube_link` yet.

**Fix**: In the `useEffect` that detects newly completed jobs (line 596-606), after `loadStats()` completes, also force a re-run of `findTrackerForVideo` for the active video. Since `loadStats` already sets `allTrackerRows` and `uploadSessionMappings`, the issue is timing — `findTrackerForVideo` fires before the state updates propagate. Add an explicit re-trigger: after `loadStats()`, call `findTrackerForVideo` again using the fresh data.

Additionally, the upload session mapping should resolve it via path 2 (`tracker_row_id`), but the `youtube_upload_sessions` query in `loadStats` fetches `youtube_video_id` and `tracker_row_id` — this should work. The issue is that `loadStats` needs to await before the effect re-triggers tracker resolution. Change `loadStats` to return a promise and await it.

### Issue 4: Times not showing / incomplete timing fields
The current `computeVideoEditTimings` returns `null` for fields where timestamps don't exist, and the UI only renders fields when they're non-null. The user wants ALL fields to always show (empty if no data), plus new fields:
- **Edit Lab Time**: `EDIT_QUEUE` → `EDIT_ON_PROGRESS`
- **Color Queue Time**: `COLOR_QUEUE` → `COLOR_ON_PROGRESS`
- **Export Queue Time**: `EXPORT_QUEUE` → `EXPORTED`
- **Exported Time**: `EXPORTED` → `CLIENT_REVIEW` or `FINALIZED`
- **Re-edit**: yes/no + duration of `RE_EDIT_ON_PROGRESS`
- **Finalized**: time ago since finalization
- **Per-editor breakdown**: Parse `EDITOR_CHANGED_FROM_X_TO_Y` entries to compute each editor's active time

## Technical Changes

### File 1: `package.json`
- Change `date-fns` to `"^4.1.0"` or `"^3.6.0"` and force reinstall

### File 2: `src/lib/video-edit-time-utils.ts` — Complete rewrite of timing
Add new fields to `VideoEditTimings`:
```ts
export interface VideoEditTimings {
  editLabTime: string | null;        // EDIT_QUEUE → EDIT_ON_PROGRESS
  editTime: string | null;           // EDIT_ON_PROGRESS → COLOR_QUEUE/EXPORT_QUEUE
  editTimeBreakdown: { editor: string; duration: string }[] | null; // per-editor
  colorQueueTime: string | null;     // COLOR_QUEUE → COLOR_ON_PROGRESS
  colorTime: string | null;          // COLOR_ON_PROGRESS → EXPORT_QUEUE
  exportQueueTime: string | null;    // EXPORT_QUEUE → EXPORTED
  exportedTime: string | null;       // EXPORTED → next stage
  clientReviewTime: string | null;   // CLIENT_REVIEW → next stage
  reEdit: boolean;                   // has RE_EDIT_ON_PROGRESS?
  reEditTime: string | null;         // RE_EDIT_ON_PROGRESS duration
  finalizedTime: string | null;      // time ago since FINALIZED
  totalTime: string | null;
  actualTime: string | null;
  pausedTime: string | null;
}
```

Add `computeEditorBreakdown()`: parse `EDITOR_CHANGED_FROM_X_TO_Y [date]` entries to split editing time per editor. Logic:
- Track current editor from first `EDIT_ON_PROGRESS`
- On `EDITOR_CHANGED_FROM_X_TO_Y`, close previous editor's segment, start new
- On `COLOR_QUEUE`/`EXPORT_QUEUE`, close current editor's segment
- Subtract paused intervals per segment

Add `finalizedTime` as "time ago" (e.g., "3d ago") using `formatDuration(now - finalizedDate)`.

### File 3: `src/components/suite/YouTubeDashboard.tsx` — Video Details section

**Timing display** (lines 1357-1474): Show ALL timing fields always, with "—" when empty:
```
Edit Lab       : 2h 30m          Color Queue : 1h 15m
Editing Time   : 3d 5h 22m       Color Time  : 4h 30m
Export Queue   : 45m              Exported    : 2d 3h
Client Review  : 1d 12h          Re-edit     : No
Finalized      : 5d ago
```

For editor breakdown: `Editing Time: Saugat (3d 23h 22m) Phurba (2d 22h 33m)`

**Upload recovery** (lines 596-606): After `loadStats()` completes, force re-resolve tracker:
```ts
useEffect(() => {
  // ...existing newly completed detection...
  if (newlyCompleted.length > 0) {
    loadStats().then(() => {
      // Force re-resolve after fresh data
      if (activeVideo) {
        findTrackerForVideo(activeVideo.videoId, activeVideo.title);
      }
    });
  }
}, [open, jobs]);
```

### File 4: `src/contexts/YouTubeUploadContext.tsx` — Upload resilience

**More retries** in `retryStatusCheck` (line 291): Add 3rd retry at 10s delay.

**Lower onerror threshold** (line 387): Change from `0.99` to `0.95`.

## Summary of All Files Changed
1. `package.json` — fix date-fns version
2. `src/lib/video-edit-time-utils.ts` — add all timing fields + per-editor breakdown
3. `src/components/suite/YouTubeDashboard.tsx` — show all timings always, fix tracker re-resolve after upload
4. `src/contexts/YouTubeUploadContext.tsx` — more upload retries, lower error threshold

