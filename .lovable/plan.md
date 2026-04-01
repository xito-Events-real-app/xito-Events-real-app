

# Simplify Album System — Data-Only, No R2 Copy

## What Changes

Currently, when a photo is selected for an album, it gets **copied to a new R2 folder** (`/Albums/AlbumName/`). The "My Album" tab then loads photos from that copied folder. This is wasteful — duplicating storage for the same files.

**New approach**: Only save the selection record in the database. The "My Album" tab will load photos using the **original `photo_key`** (which already points to the main Photos folder on R2), fetching signed URLs from the same source as the Photos tab.

## Changes

### 1. `src/lib/album-selection-api.ts` — Remove R2 copy/delete operations

- **`addToAlbum`**: Remove the `copyE2Object` call (lines 74-78). Keep only the database upsert.
- **`removeFromAlbum`**: Remove the `deleteE2Object` call (lines 114-120) and the album name resolution logic (lines 89-100). Keep only the database delete.
- Remove the `buildAlbumE2Path` helper function (lines 36-45).
- Remove the `import { copyE2Object, deleteE2Object }` import (line 2).

### 2. `src/components/client-portal/PortalMyAlbum.tsx` — No changes needed

The "My Album" tab already uses `photo_key` (the original path) to fetch signed URLs via `getE2FileUrls`. Since `photo_key` stores the original Photos folder path, everything will continue to work — it was never actually loading from the Albums subfolder. The viewer, download, and remove features all work off `photo_key`.

## Summary

This is a small, clean change — just strip out the background R2 copy/delete calls from `album-selection-api.ts`. Everything else already works with the original photo keys.

