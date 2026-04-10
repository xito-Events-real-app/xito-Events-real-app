

# Use Video Edit Tracker as Video Source for Client Portal

## Problem
The "My Videos" tab in the Client Portal only works when `bride_full_name` and `groom_full_name` exist in `contact_details_cache`. For non-wedding clients like BARSHA(OLD MATERNITY CLIENT), these fields are empty, so videos never load -- even though the `video_edit_tracker` table already has YouTube links for this client.

## Solution
Add a fallback (or primary) data source: query `video_edit_tracker` for the client's `registered_date_time_ad`, extract YouTube video IDs from the `youtube_link` column, and display them directly -- no playlist matching needed.

## How It Works

**File: `src/components/client-portal/PortalMyVideos.tsx`**

1. Accept a new prop `registeredDateTimeAD` (already available in `ClientPortal.tsx`).
2. On mount, query `video_edit_tracker` where `registered_date_time_ad` matches, `deleted = false`, and `youtube_link` is not empty.
3. Parse `youtube_link` (may contain comma-separated URLs like `https://youtu.be/HH7VgzKbA_o, https://youtu.be/zAohiy6CJZI`) and extract video IDs.
4. Build video entries with titles derived from `event_name + edit_type` (e.g. "BIRTHDAY CELEBRATION - Full Video").
5. Fetch thumbnails using the standard YouTube thumbnail URL pattern (`https://img.youtube.com/vi/{id}/mqdefault.jpg`).
6. If tracker videos are found, show them immediately. If bride/groom names are also available, still attempt the playlist approach as an enrichment (playlist provides official titles and ordering).
7. If both sources return results, prefer the playlist data but merge in any tracker-only videos not already in the playlist.

**File: `src/pages/ClientPortal.tsx`**

8. Pass `registeredDateTimeAD={decodedId}` to `PortalMyVideos`.

## Data Flow
```text
PortalMyVideos mount
  ├─ Query video_edit_tracker (direct DB, no edge function needed)
  │   → Extract video IDs from youtube_link column
  │   → Build videos with event_name + edit_type as titles
  │   → Show immediately (fast, no API call)
  │
  └─ If bride/groom names exist → also try playlist matching (existing logic)
      → Merge/prefer playlist data when available
```

## Key Details
- No new tables or migrations needed -- uses existing `video_edit_tracker` data
- No edge function calls for the fallback path -- direct Supabase query, so it's faster and avoids YouTube API quota
- The "Contact details not available" error is eliminated; videos show as long as tracker rows have YouTube links
- Thumbnail URLs use `img.youtube.com/vi/{videoId}/mqdefault.jpg` (no API call needed)

