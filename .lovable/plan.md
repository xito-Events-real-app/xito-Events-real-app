

## YouTube Upload System Overhaul

This is a large feature set spanning 7 areas. Here's the plan:

---

### 1. YouTube-Themed Upload Dialog Redesign
**File:** `src/components/suite/YouTubeUploadDialog.tsx`
- Restyle dialog with YouTube's dark theme (dark background, red accents, YouTube logo)
- Larger dialog size (`sm:max-w-2xl`)
- YouTube-branded upload button, progress bar in red

### 2. Smart Default Selection on Open
**File:** `src/components/suite/YouTubeUploadDialog.tsx`
- On dialog open, auto-select the top client (first EXPORTED client from sorted list)
- Auto-select the event associated with the most recently exported row for that client
- Default edit type to "Highlights"
- Title auto-generated in ALL CAPS format: `ANJALI & SHAKTI WEDDING HIGHLIGHTS || WEDDING TALES NEPAL`
- Use bride/groom names from `contact_details_cache` (not client_name)

### 3. Playlist Support
**New edge function action in:** `supabase/functions/youtube-upload/index.ts`
- Add actions: `listPlaylists`, `createPlaylist`, `addToPlaylist`
- `listPlaylists`: calls YouTube Data API v3 `playlists.list` to fetch all playlists from the channel
- `createPlaylist`: creates a new playlist via YouTube API
- `addToPlaylist`: adds uploaded video to selected playlist via `playlistItems.insert`

**File:** `src/components/suite/YouTubeUploadDialog.tsx`
- Add playlist dropdown populated from edge function
- Auto-suggest playlist matching bride & groom names (e.g., "ANJALI & SHAKTI WEDDING STORY")
- Option to create new playlist inline if no match found
- Playlist name editable before creation

### 4. Thumbnail Support
**File:** `src/components/suite/YouTubeUploadDialog.tsx`
- Add thumbnail file input (image/jpeg, image/png)
- After video upload completes, call YouTube API `thumbnails.set` via edge function

**Edge function:** Add `setThumbnail` action that uploads thumbnail binary to `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=...`

### 5. Global YouTube Upload Tracker (like XITO Drive)
**New context:** `src/contexts/YouTubeUploadContext.tsx`
- Modeled after `XitoDriveUploadContext` with: sessions, jobs, pause/resume/cancel, progress tracking
- Resumable upload support: use YouTube's resumable upload protocol to resume from last byte on interruption (query upload URI for status, resume from `bytes_received`)
- Store upload state in Supabase table for cross-user visibility

**New DB table:** `youtube_upload_sessions`
- Columns: `id`, `client_name`, `event_name`, `edit_type`, `title`, `playlist_id`, `video_file_name`, `file_size_bytes`, `bytes_uploaded`, `upload_uri`, `status` (pending/uploading/completed/failed/paused), `youtube_video_id`, `youtube_link`, `started_by`, `created_at`, `updated_at`
- Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.youtube_upload_sessions`

**New tracker widget:** `src/components/suite/YouTubeUploadTracker.tsx`
- Same pattern as `XitoUploadTracker` — fixed bottom-right, collapsible, expandable
- Shows YouTube icon, red theme, progress bar, pause/resume/cancel controls
- Reads from `youtube_upload_sessions` table via realtime subscription so ALL users see the same status

**File:** `src/App.tsx`
- Add `YouTubeUploadProvider` wrapper and `YouTubeUploadTracker` component

### 6. Resumable Upload (Don't Restart from Beginning)
**In `YouTubeUploadContext`:**
- Before starting upload, check if an `upload_uri` exists in DB for this session
- Query YouTube API for bytes already received: `PUT upload_uri` with `Content-Range: bytes */*`
- Resume from the returned byte offset using `file.slice(offset)` and `Content-Range: bytes offset-total/total`
- On network failure, retry from last known position

### 7. YT Column Visibility & Multi-Link Support
**File:** `src/components/video-edit/DesktopVideoEditTracker.tsx`
- Show YT column only for stages EXPORTED through FINALIZED (use a `YT_STAGES` set)
- Support multiple YouTube links per row (stored as comma-separated or JSON in `youtube_link` column)
- Render multiple clickable YouTube icons if multiple links exist

**File:** `src/components/suite/YouTubeUploadDialog.tsx` (already handles this)
- When saving youtube_link, append to existing value if one already exists (comma-separated)

**File:** `src/hooks/useVideoEditTracker.ts`
- On successful upload via context, update the matching `video_edit_tracker` row's `youtube_link`

---

### Technical Details

**Database migration:**
```sql
CREATE TABLE public.youtube_upload_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL DEFAULT '',
  event_name text NOT NULL DEFAULT '',
  edit_type text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  playlist_id text DEFAULT '',
  video_file_name text NOT NULL DEFAULT '',
  file_size_bytes bigint NOT NULL DEFAULT 0,
  bytes_uploaded bigint NOT NULL DEFAULT 0,
  upload_uri text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  youtube_video_id text DEFAULT '',
  youtube_link text DEFAULT '',
  started_by text DEFAULT '',
  tracker_row_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.youtube_upload_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.youtube_upload_sessions FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.youtube_upload_sessions;
```

**Edge function updates (`youtube-upload/index.ts`):**
- Add action-based routing: `initUpload` (existing), `listPlaylists`, `createPlaylist`, `addToPlaylist`, `setThumbnail`

**Files to create:**
- `src/contexts/YouTubeUploadContext.tsx`
- `src/components/suite/YouTubeUploadTracker.tsx`

**Files to modify:**
- `src/components/suite/YouTubeUploadDialog.tsx` (major rewrite)
- `supabase/functions/youtube-upload/index.ts` (add playlist + thumbnail actions)
- `src/components/video-edit/DesktopVideoEditTracker.tsx` (YT column visibility + multi-link)
- `src/App.tsx` (add provider + tracker)

