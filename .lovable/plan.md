

# Fix Album Selection: No Refresh + E2 Album Folders + Speed

## Problems
1. Selecting a photo causes parent re-render (page "refresh") because `onAlbumSelectionsChange` updates state in `ClientPortal.tsx`
2. Album photos not saved to iDrive E2 — need to copy to album folders
3. App is slow due to extra DB count queries per selection

## Plan

### 1. Stop Page Refresh — Localize Album State in PortalMyPhotos
**File: `src/components/client-portal/PortalMyPhotos.tsx`**
- Move `albumSelections` to local state inside PortalMyPhotos (initialized from props, synced back only on unmount)
- Use `useRef` for the toggle handler's closure to avoid recreating callbacks
- Wrap `XitoImageViewer` with `React.memo` to prevent re-renders
- DB writes become fire-and-forget (no `await` blocking UI)

**File: `src/components/client-detail/XitoImageViewer.tsx`**
- Wrap entire component export with `React.memo`

### 2. Add `copyObject` Action to Edge Function
**File: `supabase/functions/idrive-e2-api/index.ts`**
- New action `copyObject` that takes `sourceKey` and `destinationKey`
- Uses S3 PUT with `x-amz-copy-source` header for server-side copy (no data transfer)
- Also add `deleteObject` alias if needed

### 3. Add Client-Side E2 Copy/Delete Helpers
**File: `src/lib/idrive-e2-api.ts`**
- Add `copyE2Object(sourceKey, destKey)` — calls `copyObject` action
- Add `deleteE2Object` already exists — reuse it

### 4. Background E2 Sync on Album Toggle
**File: `src/lib/album-selection-api.ts`**
- Remove the extra `getAlbumCount` call inside `addToAlbum` (count checked client-side)
- Add helper `buildAlbumE2Path(clientName, monthFolder, albumName, photoKey)` to compute destination
- On add: fire-and-forget `copyE2Object(photoKey, albumPath)` after DB save
- On remove: fire-and-forget `deleteE2Object(albumPath)` after DB delete
- Album folder structure: `{MONTH} EVENTS {YEAR}/{ClientName}/Albums/{AlbumName}/{filename}`

### 5. Wire E2 Copy in PortalMyPhotos Toggle Handler
**File: `src/components/client-portal/PortalMyPhotos.tsx`**
- After optimistic state update, fire background promises:
  1. DB upsert/delete (fire-and-forget)
  2. E2 copy/delete (fire-and-forget)
- Only revert on failure with toast
- No `await` in the main flow — instant response

### Files Changed
1. `supabase/functions/idrive-e2-api/index.ts` — add `copyObject` action
2. `src/lib/idrive-e2-api.ts` — add `copyE2Object()` 
3. `src/lib/album-selection-api.ts` — remove count query, make writes non-blocking
4. `src/components/client-portal/PortalMyPhotos.tsx` — localize state, fire-and-forget saves + E2 copy
5. `src/components/client-detail/XitoImageViewer.tsx` — `React.memo` wrapper

