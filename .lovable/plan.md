

# YouTube Upload Feature

## Overview

Add a YouTube upload capability with: a button in the suite header, a dialog to select video/client/event, auto-generated titles from bride/groom names, and a YouTube link column in the video edit tracker's EXPORTED stage onwards.

## Important: Credentials

Your Google OAuth Client ID and Client Secret will be stored as backend secrets (`YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET`). These are private keys and must never be in the codebase.

## Plan

### 1. Database Migration — Add `youtube_link` column to `video_edit_tracker`

```sql
ALTER TABLE public.video_edit_tracker ADD COLUMN youtube_link text NOT NULL DEFAULT '';
```

This column will store the YouTube URL after upload, visible from EXPORTED through FINALIZED.

### 2. Store Secrets

Use the `add_secret` tool to save:
- `YOUTUBE_CLIENT_ID` = `808838065-cfnjufbaeq6oreg6o82iat4eo6oqevad.apps.googleusercontent.com`
- `YOUTUBE_CLIENT_SECRET` = `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`

### 3. Edge Function — `youtube-upload`

Create `supabase/functions/youtube-upload/index.ts`:
- Accepts a resumable upload request with video metadata (title, description, tags, privacy)
- Uses Google OAuth refresh token flow to authenticate
- Initiates a resumable upload session and returns the upload URI
- The actual file upload happens client-side directly to Google's resumable URI (avoids edge function size limits)

**Note**: This requires a one-time OAuth consent flow to get a refresh token. The edge function will handle token refresh using the client ID/secret.

### 4. New Component — `YouTubeUploadDialog.tsx`

Create `src/components/suite/YouTubeUploadDialog.tsx`:
- Triggered by a YouTube icon button in the suite header (next to Search)
- Dialog content:
  - **Client selector**: Dropdown listing clients from the video edit tracker, ordered by:
    1. EXPORTED (most recently entered first)
    2. Other active stages
    3. QUEUE
    4. FINALIZED (last)
  - **Event selector**: Shows events for the selected client
  - **Edit type selector**: Shows deliverable types (Full Video, Highlights, Reel, Teaser)
  - **Title field**: Auto-generated from `contact_details_cache` bride/groom names in pattern: `{Bride} & {Groom} {Event} {EditType}` (e.g., "Anjali & Shakti Wedding Full Video"). Editable.
  - **Video file picker**: Standard file input for MP4/MOV
  - **Upload button**: Initiates the upload flow

### 5. Auto-Title Logic

When client + event + edit type are selected:
1. Query `contact_details_cache` for `bride_full_name` and `groom_full_name` (using first names)
2. Build title: `{BrideFirstName} & {GroomFirstName} {EventName} {EditType}`
3. Pre-fill the title field (user can edit)

### 6. Update Suite Header

In `DesktopSuiteLanding.tsx` — add a YouTube icon button next to the Search button that opens `YouTubeUploadDialog`.

### 7. Update Video Edit Table — YouTube Column

In `DesktopVideoEditTracker.tsx` `VideoEditTable`:
- Add a "YouTube" column header after "Songs"
- Show a YouTube icon link if `youtube_link` is set (clickable, opens in new tab)
- Show an empty placeholder if not set
- This column appears for ALL stages (not just EXPORTED) as requested ("till the last")

### 8. Update `VideoEditRow` interface and `dbToRow` mapping

In `video-edit-api.ts`:
- Add `youtubeLink: string` to `VideoEditRow`
- Map `youtube_link` in `dbToRow()`

### Files Changed
- **Migration**: Add `youtube_link` column to `video_edit_tracker`
- **New**: `supabase/functions/youtube-upload/index.ts`
- **New**: `src/components/suite/YouTubeUploadDialog.tsx`
- **Edit**: `src/components/suite/DesktopSuiteLanding.tsx` — add YouTube button
- **Edit**: `src/components/suite/MobileSuiteLanding.tsx` — add YouTube button
- **Edit**: `src/lib/video-edit-api.ts` — add `youtubeLink` to interface + mapping
- **Edit**: `src/hooks/useVideoEditTracker.ts` — pass through youtubeLink
- **Edit**: `src/components/video-edit/DesktopVideoEditTracker.tsx` — YouTube column in table
- **Edit**: `src/components/suite/index.ts` — export new component

