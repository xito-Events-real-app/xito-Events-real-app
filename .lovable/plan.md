

# Wedding Tales Nepal YouTube Dashboard + Company Review Comments

## Overview
Replace the YouTube upload-only dialog with a full-screen YouTube dashboard. Add per-video internal commenting (not posted to YouTube) with author selection, and display these comments in the Video Edit Tracker's CLIENT_REVIEW stage as a "Company Review" column.

## Part 1: YouTube Dashboard

### New file: `src/components/suite/YouTubeDashboard.tsx`
Full-screen overlay (fixed inset-0 z-50, dark theme) with:

**Header bar**: 
- Back arrow (closes), red YouTube icon + "Wedding Tales Nepal YouTube" title
- Search input (filters videos by title across all playlists)
- Large red "Upload" button (opens existing `YouTubeUploadDialog`)

**Main area (two columns ~65/35)**:
- **Left — Video Player**: YouTube IFrame API player (reuse pattern from `PortalMyVideos.tsx`). Below player: now-playing title + playlist name
- **Right — Playlist Sidebar**: Scrollable list of ALL playlists. Each playlist is a collapsible group header showing playlist name + video count. Videos listed in upload order within each playlist. Clicking a video loads it in the player. Currently playing video highlighted.

**Bottom stats bar**:
- "Today: X uploaded" — query `youtube_upload_sessions` where `created_at::date = today` and `status = 'completed'`
- "Total: X/Y uploaded · Z remaining" — from `video_edit_tracker`: count all non-deleted rows (each row = 1 video, so FV+HL merged = 2 DB rows). "Uploaded" = rows with non-empty `youtube_link`. Remaining = total - uploaded.
- Active upload progress strip if any jobs running (from `useYouTubeUploadContext`)

**Per-video comments section** (below the player, collapsible):
- When a video is selected, show a comment panel
- Author selector: chips for BENZO / BARUN / SAUGAT / NIKIT (tap to select who's commenting)
- Text input + send button
- Comments displayed as chat bubbles with author name + timestamp
- Comments stored in a new `youtube_video_comments` table (NOT posted to YouTube)

### Data loading on mount:
1. Fetch all playlists via `listPlaylists` edge function
2. For each playlist, fetch videos via `getPlaylistVideos` (parallel, max 5 concurrent)
3. Query `video_edit_tracker` for stats
4. Query `youtube_upload_sessions` for today count

### Modify: `src/components/suite/DesktopSuiteLanding.tsx`
- Change YouTube button to open `YouTubeDashboard` overlay instead of `YouTubeUploadDialog`
- Keep `YouTubeUploadDialog` — it gets opened from within the dashboard

## Part 2: New Database Table

### Migration: `youtube_video_comments`
```sql
CREATE TABLE public.youtube_video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,           -- YouTube video ID
  playlist_id text,                 -- Which playlist this video belongs to
  author text NOT NULL,             -- BENZO, BARUN, SAUGAT, NIKIT
  comment text NOT NULL,
  tracker_row_id uuid REFERENCES public.video_edit_tracker(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.youtube_video_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public.youtube_video_comments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

## Part 3: Company Review in Video Edit Tracker

### Modify: `src/components/video-edit/DesktopVideoEditTracker.tsx`
In the CLIENT_REVIEW stage table, add a new **"Company Review"** column:
- Shows comments from `youtube_video_comments` matched by `tracker_row_id` (or by matching the `youtube_link` video ID)
- Display format: each comment as `AUTHOR: comment text` with timestamp
- Clickable to expand into a small dialog showing all comments for that row
- For merged rows, combine comments from both FV and HL tracker row IDs

### Data flow:
- When a comment is added in the YouTube Dashboard for a video, look up the matching `video_edit_tracker` row by `youtube_link` containing that video ID → store with `tracker_row_id`
- In the CLIENT_REVIEW table, query `youtube_video_comments` by `tracker_row_id` to display

## Files summary

| File | Action |
|------|--------|
| `src/components/suite/YouTubeDashboard.tsx` | Create — full dashboard |
| `src/components/suite/DesktopSuiteLanding.tsx` | Modify — swap dialog for dashboard |
| `src/components/video-edit/DesktopVideoEditTracker.tsx` | Modify — add Company Review column in CLIENT_REVIEW |
| Migration | Create `youtube_video_comments` table |

