

# YouTube Dashboard Redesign — White Theme, Tabs, Video Details

## Changes Overview

### 1. Sidebar: Two Tabs — "Recent" (default) and "Playlist"
Replace the current playlist-only sidebar with a tabbed layout using Radix Tabs:
- **Recent tab** (default): Flatten all videos from all playlists into a single list, sorted by position (most recently added first). Each video item shows its playlist name underneath the title.
- **Playlist tab**: Current collapsible playlist grouping (existing behavior).
- Search works across both tabs.

### 2. White Theme
Switch the entire dashboard from dark (`bg-[#0f0f0f]`) to white/light theme:
- Background: `bg-white`, header: `bg-gray-50`, sidebar: `bg-gray-50`
- Text: `text-gray-900` primary, `text-gray-500` secondary
- Comment section: `bg-gray-100` with appropriate borders
- Player area remains black (video player is always dark)
- Active video highlight: `bg-blue-50` instead of `bg-[#303030]`

### 3. Video Details Below Player
When a video is playing, show detailed tracker info below the title by matching `videoId` against `video_edit_tracker.youtube_link`. Query tracker rows on video select.

Display:
- **Title** (large)
- **Playlist name** | **Status badge** (e.g. EXPORTED, CLIENT_REVIEW, FINALIZED)
- **Editor**: Parse `stage_history` to compute per-editor durations. Format: `SAUGAT (2D 3H) → PHURBA (4D 3H)` if editor changed, otherwise just `SAUGAT`
- **Colorist**: name from tracker row
- **Total Time**: Same `LiveEditTimer` logic — compute from `edit_started_at` to now (or finalized end)
- **Current Stage**: Badge showing which stage
- **Event Age**: Days between `event_date_ad` and today — `"X days old event"`

To compute editor timeline from `stage_history`:
```
stage_history format:
  EDIT_LAB [2026-03-15T10:00:00Z]
  EDIT_ON_PROGRESS [2026-03-15T12:00:00Z]
  COLOR_QUEUE [2026-03-17T15:00:00Z]
  ...
```
Cross-reference with the `editor` field changes — since stage_history doesn't track editor changes, we'll show the current editor + total time. If there's only one editor, show `EDITOR_NAME (Xd Xh)`. The stage_history doesn't capture editor transitions, so we show current editor + colorist with total pipeline time.

### 4. Smaller Player
Reduce player from `aspect-video` (16:9 full width) to a smaller size — approximately `max-w-[720px] aspect-video` or `h-[360px]` — to leave space for the details panel below.

### 5. Modern Bottom Stats Bar
Redesign the bottom bar with a cleaner white theme:
- Pill-shaped stat badges with subtle gradients
- Active upload progress as a smooth animated bar
- Use colored dots/icons instead of text-heavy layout

## Files to Modify

1. **`src/components/suite/YouTubeDashboard.tsx`** — All UI changes (theme, tabs, video details, layout)

### No database or edge function changes needed
- Tracker data for video details comes from existing `video_edit_tracker` table
- Matching by `youtube_link` containing the `videoId`

