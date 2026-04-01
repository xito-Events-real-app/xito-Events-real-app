

# Download from pCloud While Viewing from XITO Drive

## What It Does

In the XITO Image Viewer (used in the client portal photo browsing), the existing Download button currently downloads the compressed XITO Drive (R2) version. This change makes it download the **high-quality pCloud version** instead, while viewing remains from XITO Drive for speed.

## How It Works

The XITO Drive S3 key maps directly to a pCloud path:
- XITO key: `FALGUN EVENTS 2082/KARISHMA SHRESTHA/Photos/WEDDING(BOTH SIDES)/SAFAL KC/photo.jpg`  
- pCloud path: `/WEDDING TALES NEPAL/FALGUN EVENTS 2082/KARISHMA SHRESTHA/Photos/WEDDING(BOTH SIDES)/SAFAL KC/photo.jpg`

pCloud's API supports `stat` by path (returns fileid), then we use the existing stream proxy (`getPCloudStreamUrl`) for a reliable download URL that works across IPs.

## Implementation

### 1. Add `getPCloudFileLinkByPath` to `src/lib/pcloud-api.ts`

New function that:
- Calls pCloud's `/stat` endpoint with `path` parameter to get the `fileid`
- Returns a stream proxy URL via `getPCloudStreamUrl(fileid)` for reliable cross-device downloads

### 2. Update Edge Function `supabase/functions/pcloud-api/index.ts`

Add path support to the `stat` action — accept either `fileid` or `path` parameter and pass it to pCloud's `/stat` API.

### 3. Update `XitoImageViewer.tsx`

- Add optional prop: `onDownloadHQ?: (photoKey: string) => void`
- When provided, the Download button calls `onDownloadHQ(currentPhotoKey)` instead of the default XITO download
- Show a loading spinner on the download button while fetching the pCloud link
- The download button label changes subtly (e.g., small "HQ" badge) to indicate it's downloading the high-quality version

### 4. Update `PortalMyPhotos.tsx`

- Import `getPCloudFileLinkByPath` from pcloud-api
- Create `handleDownloadHQ` callback that:
  1. Maps the XITO key to pCloud path: `/WEDDING TALES NEPAL/${key}`
  2. Calls `getPCloudFileLinkByPath(pcloudPath)` to get stream URL
  3. Triggers download via `window.open(url)` or `<a>` element
- Pass `onDownloadHQ={handleDownloadHQ}` to `XitoImageViewer`

### 5. Update grid download button in `PortalMyPhotos.tsx`

The small download icon on hover in the photo grid should also download from pCloud (same logic).

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/pcloud-api.ts` | Add `getPCloudFileLinkByPath(path)` |
| `supabase/functions/pcloud-api/index.ts` | Support `path` param in `stat` action |
| `src/components/client-detail/XitoImageViewer.tsx` | Add `onDownloadHQ` prop with loading state |
| `src/components/client-portal/PortalMyPhotos.tsx` | Wire up pCloud HQ download for viewer and grid |

