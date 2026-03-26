

## Plan: Fix pCloud Thumbnails and File Preview

### Root Cause
The `isPCloudImage()` and `isPCloudVideo()` functions only check `item.contenttype`. When pCloud's `listfolder` response doesn't include `contenttype` for some files (common in nested folders), every file is treated as "unknown" — so no thumbnails are fetched and clicking a photo tries `window.open()` instead of the in-app preview.

### Fix

**`src/lib/pcloud-api.ts`** — Add file extension fallback to `isPCloudImage` and `isPCloudVideo`:

```typescript
export function isPCloudImage(item: PCloudItem): boolean {
  const ct = item.contenttype || '';
  if (ct.startsWith('image/')) return true;
  const ext = item.name.split('.').pop()?.toLowerCase() || '';
  return ['jpg','jpeg','png','gif','webp','bmp','tiff','svg','heic'].includes(ext);
}

export function isPCloudVideo(item: PCloudItem): boolean {
  const ct = item.contenttype || '';
  if (ct.startsWith('video/')) return true;
  const ext = item.name.split('.').pop()?.toLowerCase() || '';
  return ['mp4','mov','avi','mkv','webm','m4v','wmv','flv'].includes(ext);
}
```

This single change fixes both issues:
- **Thumbnails**: Files will now be recognized as images, so `getPCloudThumbsBatch` will be called for them
- **Preview**: Clicking a photo will open the in-app `PCloudPreviewDialog` instead of trying `window.open`

No other files need changes.

