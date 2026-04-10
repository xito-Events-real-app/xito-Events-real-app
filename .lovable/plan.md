

# Unlink Video from Client Portal

## Problem
Currently all YouTube links in `video_edit_tracker` appear on the Client Portal's "My Videos" tab. You need a way to hide specific videos from clients.

## Solution
Create a new `portal_hidden_videos` table to store video IDs that should be hidden from the portal. Add an "Unlink from Client Portal" button in the YouTube Dashboard with a confirmation dialog. Filter hidden videos out in `PortalMyVideos.tsx`.

## Database Migration
Create table `portal_hidden_videos`:
- `id` (uuid, PK)
- `registered_date_time_ad` (text, not null) — links to client
- `video_id` (text, not null) — the YouTube video ID to hide
- `created_at` (timestamptz, default now())
- Unique constraint on `(registered_date_time_ad, video_id)`
- RLS: allow all (matches existing pattern)

## File Changes

### 1. `src/components/suite/YouTubeDashboard.tsx`
- Add an "Unlink from Client Portal" button next to the "Send to Client" button (when `trackerInfo` exists)
- Clicking opens an AlertDialog: "Are you sure? This video will no longer appear on the client's portal."
- On confirm: insert `{ registered_date_time_ad, video_id }` into `portal_hidden_videos`
- Show toast confirmation
- Also show a "Re-link to Portal" button if the video is already hidden (query on active video change)

### 2. `src/components/client-portal/PortalMyVideos.tsx`
- After building the video list, query `portal_hidden_videos` for the client's `registeredDateTimeAD`
- Filter out any video whose `videoId` is in the hidden set
- No UI change on the portal side — hidden videos simply don't appear

## Data Flow
```text
YouTube Dashboard → "Unlink from Portal" button
  → AlertDialog confirmation (Yes/No)
  → Insert into portal_hidden_videos(registered_date_time_ad, video_id)
  → Toast: "Video unlinked from client portal"

Client Portal → PortalMyVideos loads videos
  → Query portal_hidden_videos for this client
  → Filter out hidden video IDs
  → Display remaining videos
```

