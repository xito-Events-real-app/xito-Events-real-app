

# YouTube Dashboard Performance & UX Improvements

## Changes

### 1. Cache YouTube data in IndexedDB
Store playlists, playlist videos, and recent uploads in IndexedDB so subsequent opens load instantly from cache, then refresh in the background.

- On open: load from IndexedDB cache immediately, show cached data, then fetch fresh data from YouTube API in background
- On upload completion: trigger background refresh
- Cache keys: `yt_playlists`, `yt_recent_videos`, with timestamps
- Use the existing `getDatabase()` helper from `src/lib/indexeddb-config.ts` with a new store, or use a simple `localStorage` approach (JSON stringify) since the data is relatively small (video metadata only, no binary)
- Use `localStorage` with keys `yt_cache_recent`, `yt_cache_playlists`, `yt_cache_timestamp`

### 2. Infinite scroll for Recent tab
Currently loads max 100 videos. Change to:
- Initial load: 50 videos (via `listRecentUploads` with `maxResults: 50`)
- When user scrolls near bottom of Recent tab, fetch next page using `nextPageToken`
- Edge function `listRecentUploads` needs to return `nextPageToken` so the client can request more
- Add `nextPageToken` param support to `listRecentUploads` action in the edge function
- Client keeps appending videos as user scrolls

### 3. Relative time tags on Recent videos
Replace the date format (`Mar 15, 2026`) with relative time: `2 hrs ago`, `1 day ago`, `3 months ago`.
- Simple helper function: compute diff from `publishedAt` to now, return human-readable string

### 4. Increase player size and sidebar width
- Player: remove `max-w-[720px]`, make it larger — use `max-w-[900px]` or let it fill available space
- Sidebar: increase from `w-[380px]` to `w-[480px]`
- These are simple Tailwind class changes

## Files to modify

| File | Change |
|------|--------|
| `src/components/suite/YouTubeDashboard.tsx` | Add localStorage caching, infinite scroll, relative time, increase sizes |
| `supabase/functions/youtube-upload/index.ts` | Add `pageToken` support to `listRecentUploads` + redeploy |

## No database changes needed

