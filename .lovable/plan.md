

## Client Portal: YouTube Playlist Videos + White Theme

### What needs to happen

The Client Portal's "Videos" tab will be completely redesigned to fetch and display YouTube playlist videos directly, with a white background theme applied across the entire portal.

### 1. New Edge Function Action: `getPlaylistVideos`
**File:** `supabase/functions/youtube-upload/index.ts`

Add a new action `getPlaylistVideos` that:
- Takes `playlistId` as input
- Calls YouTube Data API `playlistItems.list` with `part=snippet,contentDetails`
- Paginates to get all videos
- Returns `{ videos: [{ videoId, title, thumbnailUrl, position }] }`

Also add `searchPlaylists` action (or reuse `listPlaylists`) so the portal can search for a playlist matching the client name.

### 2. Rewrite `PortalMyVideos.tsx`
**File:** `src/components/client-portal/PortalMyVideos.tsx`

Complete rewrite:
- Remove pCloud tab/logic entirely, remove YouTube/pCloud sub-tabs
- On mount, call `listPlaylists` via edge function to find playlist matching client's bride+groom names (passed as new props from `ClientPortal.tsx`)
- Once playlist found, call `getPlaylistVideos` to get all videos in it
- Display playlist title at top (e.g., "Abhinash & Subekhsya Wedding Stories") — no "YouTube" label
- Embed YouTube player using `<iframe src="https://www.youtube.com/embed/{videoId}?autoplay=1">` for the active video
- Below the player: video title, "Open in YouTube" button linking to `https://youtube.com/watch?v={videoId}`
- Below that: scrollable playlist of other videos with thumbnails (from YouTube API), titles
- Clicking a playlist item changes the embedded video
- All styled with white background, dark text — YouTube-like appearance

### 3. Pass Contact Data to Videos Tab
**File:** `src/pages/ClientPortal.tsx`

- Pass `brideFullName` and `groomFullName` from `contactData` as props to `PortalMyVideos` so it can match playlist names
- Also pass `registeredDateTimeAD` for potential future use

### 4. White Theme for Entire Client Portal
**File:** `src/pages/ClientPortal.tsx`

Change the portal's background and text theme:
- `bg-[hsl(220,25%,6%)]` → `bg-white`
- `text-white` → `text-gray-900`
- Header: white/light background with subtle border
- Bottom nav: white background, adjusted icon/text colors

**File:** `src/components/client-portal/PortalBottomNav.tsx`
- Update background from dark to white
- Update active/inactive colors for light theme

**File:** Other portal components (`PortalDashboard`, `PortalMyPhotos`, `PortalMyPayment`, `PortalMyDetails`, `PortalMyAlbum`)
- Update text colors from `text-white/X` patterns to dark equivalents
- Update card backgrounds from dark to light

### Technical Details

**Edge function new action:**
```
case "getPlaylistVideos": {
  // paginate playlistItems.list?part=snippet,contentDetails&playlistId=X
  // return { videos: [{ videoId, title, thumbnailUrl }] }
}
```

**YouTube embed URL format:**
```
https://www.youtube.com/embed/{videoId}?autoplay=1&rel=0
```

**Playlist matching logic:**
- Fetch all playlists via `listPlaylists`
- Find first playlist whose title contains both bride and groom first names (case-insensitive)
- If no match, show "No videos available" state

**Files to modify:**
- `supabase/functions/youtube-upload/index.ts` — add `getPlaylistVideos` action
- `src/components/client-portal/PortalMyVideos.tsx` — complete rewrite
- `src/pages/ClientPortal.tsx` — pass contact props, white theme
- `src/components/client-portal/PortalBottomNav.tsx` — white theme
- `src/components/client-portal/PortalDashboard.tsx` — white theme
- `src/components/client-portal/PortalMyPhotos.tsx` — white theme
- `src/components/client-portal/PortalMyPayment.tsx` — white theme
- `src/components/client-portal/PortalMyDetails.tsx` — white theme
- `src/components/client-portal/PortalMyAlbum.tsx` — white theme
- `src/components/client-portal/PortalPhotoEventNav.tsx` — white theme

