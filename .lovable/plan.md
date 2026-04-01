

# Migrate XITO DRIVE from iDrive E2 to Cloudflare R2

## Overview
Replace all iDrive E2 storage with Cloudflare R2. Since R2 is S3-compatible, the edge function keeps the same SigV4 signing logic — only the env var names and error messages change. All client-side code keeps the same API surface; only the import path and internal function name change for clarity.

**Egress optimization**: R2 has zero egress fees, but to keep bandwidth minimal, no changes to the lazy-loading pattern — photos only load when the user actively views a tab. The existing module-level caches already prevent redundant fetches.

## Technical Changes

### 1. Add Cloudflare R2 Secrets
Use `add_secret` tool to request 5 secrets from user:
- `CF_R2_ENDPOINT` (e.g. `https://<account-id>.r2.cloudflarestorage.com`)
- `CF_R2_ACCESS_KEY`
- `CF_R2_SECRET_KEY`
- `CF_R2_BUCKET`
- `CF_R2_REGION` (typically `auto`)

### 2. Replace Edge Function: `supabase/functions/idrive-e2-api/index.ts`
- Rename env var reads from `IDRIVE_E2_*` to `CF_R2_*`
- Update error messages from "iDrive E2" to "Cloudflare R2"
- All SigV4 signing logic stays identical (R2 is S3-compatible)
- Keep all actions unchanged: `list`, `listRecursive`, `createFolder`, `upload`, `delete`, `getSignedUrl`, `getSignedUrls`, `getUploadUrl`, `copyObject`

### 3. Rename Client-Side API: `src/lib/idrive-e2-api.ts`
- Keep the file but update internal references and `FUNCTION_NAME` constant
- All exported function names and types (`E2File`, `listE2Folder`, etc.) stay the same to minimize diff across 7 consumer files
- Alternatively, just update the edge function name reference — the client API file acts as a thin wrapper

### 4. Remove Old iDrive E2 Secrets
After migration is confirmed working, the old secrets (`IDRIVE_E2_ENDPOINT`, `IDRIVE_E2_ACCESS_KEY`, `IDRIVE_E2_SECRET_KEY`, `IDRIVE_E2_BUCKET`, `IDRIVE_E2_REGION`) can be cleaned up.

### 5. Egress Protection — No Background Loads
Verify existing behavior: photos only fetch signed URLs when user clicks into a tab. The module-level `folderCache`/`urlCache` prevent re-fetches. No prefetching or background thumbnail loading exists. This is already safe.

### 6. Fix Runtime Error
The `toLowerCase` error in the video edit tracker needs a null guard — will fix silently.

## Files Modified
| File | Change |
|------|--------|
| `supabase/functions/idrive-e2-api/index.ts` | Swap `IDRIVE_E2_*` env vars → `CF_R2_*`, update error messages |
| `supabase/config.toml` | No change needed (function name stays same) |
| `src/lib/idrive-e2-api.ts` | No change needed (thin wrapper, function name unchanged) |

## Files NOT Changed
All 7 consumer files (`XitoDriveBrowser`, `XitoDrivePhotoGallery`, `PortalMyPhotos`, `PortalMyAlbum`, `AlbumSection`, `e2-sync`, `album-selection-api`) remain untouched — they import from `src/lib/idrive-e2-api.ts` which calls the same edge function.

## Execution Order
1. Request R2 secrets from user via `add_secret`
2. Update edge function env var references
3. Fix runtime error
4. Test

