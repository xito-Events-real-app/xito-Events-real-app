

# Album Selection Feature for Client Portal Photos

## Overview

When viewing photos in the Client Portal, add album selection buttons below each photo (in the viewer). Albums are derived from the client's deliverables (bride_album, groom_album, other_album from `client_deliverables` table). Each album holds max 140 photos. Add a new "My Album" tab to view selected photos per album.

## Data Model

**New table: `client_album_selections`**
- `id` uuid PK
- `registered_date_time_ad` text NOT NULL
- `album_type` text NOT NULL (e.g. 'bride_album', 'groom_album', 'other_album')
- `album_name` text NOT NULL (display name from deliverables)
- `photo_key` text NOT NULL (S3 key of selected photo)
- `photo_url` text (cached signed URL, optional)
- `selected_at` timestamptz DEFAULT now()
- UNIQUE(registered_date_time_ad, album_type, photo_key)

## Changes

### 1. Database Migration
Create `client_album_selections` table with public RLS policy (matching other tables' pattern).

### 2. New API: `src/lib/album-selection-api.ts`
- `getAlbumSelections(registeredDateTimeAD)` → fetch all selections
- `addToAlbum(registeredDateTimeAD, albumType, albumName, photoKey)` → insert (check count < 140)
- `removeFromAlbum(registeredDateTimeAD, albumType, photoKey)` → delete
- `getAlbumCount(registeredDateTimeAD, albumType)` → count

### 3. Load Album Deliverables in ClientPortal.tsx
- Query `client_deliverables` for album entries (section='album', enabled=true): bride_album, groom_album, other_album
- Pass available albums + `registeredDateTimeAD` to `PortalMyPhotos`

### 4. Update XitoImageViewer — Album Selection Bar
- Accept new props: `albums` (list of {type, name}), `selections` (map of photoKey → albumTypes[]), `onToggleAlbum(photoKey, albumType, albumName)`
- Render a bottom bar below the image with album buttons:
  - Each button shows album name + count (e.g. "Bride Album (12/140)")
  - Small check/plus icon inside each button to toggle selection
  - Selected state: filled rose button; unselected: outline button
  - Smooth toggle animation

### 5. Update PortalMyPhotos
- Load album deliverables and selections on mount
- Pass albums + selections + toggle handler to XitoImageViewer
- On toggle: optimistic state update + DB write

### 6. Add "My Album" Tab
- Add `'album'` to `PortalTab` type in PortalBottomNav (6th tab with `BookOpen` icon)
- Create `src/components/client-portal/PortalMyAlbum.tsx`:
  - Shows album tabs (Bride Album, Groom Album, Other Album)
  - Lists selected photos for each album in a grid
  - Shows count (X/140) per album
  - Click opens XitoImageViewer for that album's photos
  - Option to remove photos from album

### 7. Wire in ClientPortal.tsx
- Load `client_album_selections` data
- Pass to both PortalMyPhotos and PortalMyAlbum
- Add album tab rendering

## Technical Details

### Album Selection Flow
```text
User views photo in XitoImageViewer
  → Bottom bar shows available albums from deliverables
  → Tap album button → toggles photo in/out of that album
  → Optimistic UI + upsert/delete in client_album_selections
  → Count updates live (X/140)
```

### Files Changed/Created
1. **Migration**: Create `client_album_selections` table
2. **New**: `src/lib/album-selection-api.ts`
3. **New**: `src/components/client-portal/PortalMyAlbum.tsx`
4. **Modified**: `src/components/client-detail/XitoImageViewer.tsx` — add album bar props
5. **Modified**: `src/components/client-portal/PortalMyPhotos.tsx` — load albums/selections, pass to viewer
6. **Modified**: `src/components/client-portal/PortalBottomNav.tsx` — add Album tab
7. **Modified**: `src/pages/ClientPortal.tsx` — load deliverables + selections, wire album tab

