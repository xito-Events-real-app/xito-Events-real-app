

# Fix YouTube Upload & Sync Issues

## Problems Found (from DB evidence)

1. **Duplicate uploads (2 videos showing as 4)**: Each upload created TWO `youtube_upload_sessions` rows (e.g., two "Full Video" and two "Highlights" entries, all with identical `file_size_bytes`). The `startUpload` function likely fired twice -- either from a double-click or React StrictMode re-render.

2. **Successful uploads showing as "failed"**: All 4 sessions show `bytes_uploaded = file_size_bytes` (fully uploaded), yet `status = 'failed'`. The video DID upload to YouTube, but the post-upload code (parsing response, updating tracker) threw an error, causing the catch block to mark it as "failed".

3. **YouTube icon not showing on client dashboard**: The `DashboardEventDetails` component only queries tracker rows where `youtube_link != ''`. Since the upload "failed" after the actual upload, `youtube_link` was never written to `video_edit_tracker`. The background `syncYouTubeLinks` only runs from the Video Edit Tracker page, not from Client Detail.

4. **Event name `PRE+BRIDE RECEPTION` matching issues**: The `+` character in event names doesn't get normalized in `syncYouTubeLinks`, so it fails to match YouTube video titles.

## Changes

### 1. Prevent duplicate uploads (`src/contexts/YouTubeUploadContext.tsx`)
- Add a `startingRef` guard in `startUpload` to prevent double-invocation within 2 seconds for the same file name
- Deduplicate: check if a job with the same `file.name + eventName + editType` is already in the jobs list before creating a new one

### 2. Fix false "failed" status (`src/contexts/YouTubeUploadContext.tsx`)
- In `xhr.onload`, the video uploads successfully (status 200) but if `addToPlaylist` or `setThumbnail` throws, the outer try/catch marks the whole job as failed
- Move playlist and thumbnail operations outside the main try/catch so they don't cause a "failed" status
- Add a safety check: if `xhr.status >= 200 && xhr.status < 300` and we successfully parsed the video ID, always mark as "completed" first, then attempt playlist/thumbnail as best-effort

### 3. Auto-sync YouTube links after upload completes (`src/contexts/YouTubeUploadContext.tsx`)
- After successful upload + addToPlaylist, invalidate the localStorage playlist cache (`yt_cache_playlists_*`)
- If `trackerRowId` was provided and `youtube_link` was written, no further action needed
- If `trackerRowId` is empty (couldn't match), trigger a targeted sync for this client's tracker rows

### 4. Run YouTube link sync from Client Detail (`src/components/client-detail/DashboardEventDetails.tsx`)
- After fetching tracker rows, check if any EXPORTED+ rows have empty `youtube_link`
- If so, run `syncYouTubeLinks` for those rows in the background, then re-fetch to update the YouTube icons

### 5. Improve event name matching (`src/lib/youtube-link-sync.ts`)
- Normalize `+` to space in `normalizeForMatch`
- Add word-based matching: check if all significant words (3+ chars) from the event name appear in the video title, instead of requiring exact substring
- This fixes `PRE+BRIDE RECEPTION` matching against titles like `PRE BRIDE RECEPTION FULL VIDEO`

### 6. Clear playlist cache on upload (`src/contexts/YouTubeUploadContext.tsx`)
- After successful `addToPlaylist`, remove localStorage keys matching `yt_cache_playlist_videos_*` for that playlist ID so the YouTube Dashboard shows new videos immediately

## File Summary

| File | Changes |
|------|---------|
| `src/contexts/YouTubeUploadContext.tsx` | Dedup guard, fix false-fail, cache invalidation, post-upload sync |
| `src/lib/youtube-link-sync.ts` | Normalize `+`, word-based matching, export single-client sync helper |
| `src/components/client-detail/DashboardEventDetails.tsx` | Run background sync for rows missing YouTube links |

