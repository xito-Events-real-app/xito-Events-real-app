

## Auto-populate YT column from YouTube playlist videos

### Problem
The YT column in the Video Edit Tracker only gets populated when a video is uploaded through the app's upload dialog. If videos were uploaded directly to YouTube (or from another device), the YT column stays empty even though the video exists in the client's playlist.

### Solution
Add a background sync that fetches videos from the client's YouTube playlist and matches them to tracker rows based on the video title pattern: `{BRIDE} & {GROOM} {EVENT_NAME} {EDIT_TYPE} || WEDDING TALES NEPAL`.

### How it works

1. **Trigger**: When the Video Edit Tracker loads (or on a manual refresh), for rows in EXPORTED/CLIENT_REVIEW/RE_EDIT/FINALIZED stages that have an empty `youtube_link`, attempt to find the matching YouTube video.

2. **Matching logic**:
   - Look up the client's contact details to get bride/groom names
   - Find the matching YouTube playlist using the same fuzzy-match logic already used in the Client Portal
   - Fetch all videos from that playlist using the existing `getPlaylistVideos` edge function action
   - Match video titles to tracker rows by checking if the title contains the event name (e.g., "BRIDES MEHNDI") and edit type (e.g., "HIGHLIGHTS", "FULL VIDEO")
   - For merged rows (Full Video + Highlights), collect both matching links

3. **Storage**: Write matched YouTube links to the `youtube_link` column on `video_edit_tracker`, comma-separated for merged rows (same format already used by the upload system).

### Files to modify

**`src/hooks/useVideoEditTracker.ts`**
- Add a `syncYouTubeLinks()` function that runs after initial load
- Groups rows by `registeredDateTimeAD` (client) to batch playlist lookups
- Only processes rows in EXPORTED+ stages with empty `youtubeLink`
- Fetches contact details and playlists, matches videos to rows, updates DB

**`src/components/video-edit/DesktopVideoEditTracker.tsx`**
- No structural changes needed; the YT column already renders `youtubeLink` data
- Optionally add a "Sync YT Links" button in the toolbar for manual trigger

### Matching algorithm (pseudocode)
```text
For each client with empty-YT rows:
  1. Get bride/groom names from contact_details_cache
  2. Fetch all playlists via listPlaylists
  3. Find playlist matching "{BRIDE} & {GROOM}" (fuzzy)
  4. Fetch playlist videos via getPlaylistVideos
  5. For each tracker row:
     - Normalize event name: "Brides Mehndi" → "BRIDES MEHNDI"
     - Normalize edit type: "Highlights" → "HIGHLIGHTS"
     - Find video whose title contains both event + edit type
     - If found: update youtube_link = "https://youtu.be/{videoId}"
```

### Edge cases
- Merged rows (FV + HL): find two videos, store comma-separated links
- Multiple events same client: each row matched independently by event name
- No playlist found: skip silently
- Already has youtube_link: skip (don't overwrite manual uploads)
- Rate limiting: batch by client so each client = 1 playlist lookup + 1 video fetch

