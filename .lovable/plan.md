

## Plan: Fix XITO DRIVE Issues

### Issues to Address

1. **Folder flickering** -- Extra E2 folders flash briefly before virtual folders settle
2. **Videos not playing inline** -- Video files open in new tab / download instead of playing
3. **Mobile gallery experience** -- Need swipe gestures, photo counter (3 of 45), proper full-screen gallery
4. **"Direct to iDrive" concern** -- The edge function is required because S3 secret keys cannot be exposed in browser code. It only acts as a URL signer (generates presigned URLs), then the browser talks directly to iDrive for actual file data. No file data passes through the middleware.

### Technical Details

**Fix 1: Folder Flickering**
- In `XitoDriveBrowser.tsx`, the `useEffect` that fetches E2 data sets `e2Loading = true` but does NOT clear `e2Folders` and `e2Files` immediately when breadcrumb changes
- Old E2 data from previous folder persists during the async fetch, causing mismatched virtual vs E2 names to flash
- Fix: Add `setE2Files([]); setE2Folders([]);` at the start of the fetch effect, before the API call

**Fix 2: Inline Video Playback**
- In `XitoDrivePhotoGallery.tsx`, add video file detection (mp4, mov, avi, mkv, webm)
- Include video files in the gallery alongside images with proper thumbnails (play icon overlay)
- In the full-screen preview, render a `<video>` tag with controls instead of `<img>` when the file is a video
- Batch-fetch signed URLs for video files too

**Fix 3: Mobile Gallery with Swipe**
- Replace the current full-screen preview with a proper touch-enabled gallery
- Add touch swipe detection using `touchstart`/`touchend` events (no extra library needed)
- Add photo counter: "3 of 45" displayed at the top
- Add keyboard navigation (arrow keys, Escape)
- Make the preview truly full-screen with `safe-area-inset` padding for notched phones
- Smooth transitions between photos

### Files to Modify

1. **`src/components/xito-drive/XitoDriveBrowser.tsx`**
   - Clear `e2Files` and `e2Folders` immediately when breadcrumb changes (line ~79, add two setState calls before the API call)

2. **`src/components/xito-drive/XitoDrivePhotoGallery.tsx`** -- Major rewrite:
   - Add `isVideoFile()` helper alongside `isImageFile()`
   - Combine image + video files as "media files" for the gallery
   - Batch-fetch URLs for all media (images + videos)
   - Video thumbnails: show play icon overlay on a dark placeholder
   - Full-screen preview: render `<video controls autoPlay>` for video files, `<img>` for images
   - Add touch swipe: track `touchStartX` on `touchstart`, calculate delta on `touchend`, navigate if delta > 50px
   - Add counter: `"{currentIndex + 1} of {totalMedia}"` in the top bar
   - Add keyboard listeners for ArrowLeft, ArrowRight, Escape
   - Mobile-optimized layout: full viewport, safe-area padding, larger touch targets for prev/next

