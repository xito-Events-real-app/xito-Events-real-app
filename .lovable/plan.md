

# Fix YouTube Dashboard: Restore Direct YouTube API + Minimize Quota Usage

## Problem
The recent changes replaced YouTube API calls with tracker-based fallback data. The user wants actual YouTube videos (with correct dates, thumbnails, real titles) from the YouTube API. The quota exceeded error is temporary — quota resets daily at midnight Pacific Time.

## Root Cause of Quota Exhaustion
Every time the dashboard opens, it calls:
- `listRecentUploads` (1 API call = ~1 quota unit)
- `listPlaylists` (1 call) + `getPlaylistVideos` per playlist (N calls in batches of 5)
- Infinite scroll calls `listRecentUploads` again with pagination

If there are 20 playlists, that's ~22 API calls per dashboard open. YouTube's daily quota is 10,000 units. Opening the dashboard frequently burns through it fast.

## Plan

### 1. Restore YouTube API as Primary Data Source
- Revert `loadRecentUploads` and `loadPlaylists` to be called on dashboard open (as they were before)
- Keep `loadFromTracker` only as a fallback when API calls fail (quota/network errors)
- On open: show cached data instantly, then call YouTube API in background to refresh
- Cache fresh API data to localStorage

### 2. Aggressive Caching to Minimize Quota
- Add a **cache timestamp** alongside cached data (`yt_cache_recent_ts`, `yt_cache_playlists_ts`)
- Only call the YouTube API if cache is **older than 30 minutes** (configurable)
- If cache is fresh (< 30 min old), skip API calls entirely — zero quota usage
- Add a manual **"Refresh"** button so user can force-refresh when needed (costs quota but is intentional)

### 3. Reduce Playlist Video Fetches
- Don't fetch `getPlaylistVideos` for every playlist on load — only fetch when a playlist is **expanded/clicked**
- Cache individual playlist videos separately with timestamps
- This alone could cut 15-20 API calls per session

### 4. Files to Modify

**`src/components/suite/YouTubeDashboard.tsx`**:
- Add `YT_CACHE_RECENT_TS` and `YT_CACHE_PLAYLISTS_TS` localStorage keys
- Add `CACHE_TTL_MS = 30 * 60 * 1000` (30 minutes)
- Modify `useEffect` on open: check cache age before calling API
- Restore `loadRecentUploads` + `loadPlaylists` as background refresh (only when cache is stale)
- Move playlist video loading to on-expand (lazy load)
- Add a small refresh icon button in the header
- Keep tracker fallback only for API error scenarios

**No edge function changes needed** — the API calls themselves are fine, we just need to call them less often.

### Technical Details

```text
Dashboard Open Flow (new):
┌─────────────────────────────────┐
│ 1. Show cached data instantly   │
│ 2. Check cache timestamp        │
│    ├─ < 30 min → done (0 API)   │
│    └─ > 30 min → background     │
│       refresh via YouTube API   │
│       ├─ success → update cache │
│       └─ fail → keep cache,     │
│          fallback to tracker    │
└─────────────────────────────────┘

Playlist Expand Flow:
┌─────────────────────────────────┐
│ Click playlist → check cache    │
│ ├─ cached videos → show them    │
│ └─ no cache → fetch from API    │
│    → cache result               │
└─────────────────────────────────┘
```

This approach means repeated dashboard opens within 30 minutes use **zero quota**, and playlist browsing only fetches videos for playlists the user actually clicks on.

