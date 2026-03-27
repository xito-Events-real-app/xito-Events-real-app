

## Plan: Unify XITO DRIVE with Label-Based Folders + Sync System

### Problem
XITO DRIVE (iDrive E2) currently uses numeric folder keys (`2082-10`) for S3 paths, while pCloud and Barun's Research use descriptive labels (`MAGH EVENTS 2082`). XITO DRIVE also lacks the "Sync Now" banner that the other two modules have. Additionally, the Album section in Client Detail must stay in sync with whatever path format XITO DRIVE uses.

### Changes Overview

**1. Edge Function: Add recursive list action** (`supabase/functions/idrive-e2-api/index.ts`)
- Add a `listRecursive` action that calls S3 ListObjectsV2 **without** a delimiter, returning all folder prefixes under a given prefix. This is needed for the sync status check (similar to what pCloud does natively with `recursive: 1`).

**2. Client API: Add recursive list helper** (`src/lib/idrive-e2-api.ts`)
- Add `listE2FolderRecursive(prefix)` that calls the new `listRecursive` action and returns a `Set<string>` of all existing folder paths.

**3. Sync logic for iDrive E2** (`src/lib/pcloud-sync.ts` or new `src/lib/e2-sync.ts`)
- Add `checkE2SyncStatus(clients, assignments)` — compares `buildXitoFolderTree()` output against actual E2 folders via `listE2FolderRecursive`.
- Add `syncE2PendingFolders(paths)` — batch-creates missing folders using `createE2Folder`.
- Reuses existing `SyncProgress` and `PendingSyncStatus` types.

**4. Update S3 paths to use labels** (`src/components/xito-drive/XitoDriveBrowser.tsx`)
- Change the breadcrumb navigation at level 0 from `navigate(g.label, g.key)` to `navigate(g.label, g.label)` so the S3 prefix uses `MAGH EVENTS 2082` instead of `2082-10`.
- Add the sync banner (pending changes detection + "Sync Now" button) matching pCloud/Research style.
- Integrate with global upload context or keep existing inline upload (already working).

**5. Update Album section S3 prefix** (`src/components/client-detail/AlbumSection.tsx`)
- Change the prefix from `${majorityYearMonth}/...` to use the label format: compute `NEPALI_MONTHS[monthNum] + " EVENTS " + year` from `majorityYearMonth`.
- This ensures Album photos resolve to the same folders as XITO DRIVE.

**6. Update tree builder path format** (`src/lib/xito-drive-utils.ts`)
- The `buildXitoFolderTree` already uses `group.label` — no change needed there. Verify consistency.

### Technical Details

**Recursive S3 listing** — S3 `ListObjectsV2` without a delimiter returns all keys (including nested). We parse unique folder prefixes from the returned keys. This is done server-side in the edge function to keep it efficient.

**Sync flow** — Same pattern as pCloud:
1. On mount, call `checkE2SyncStatus()` → get missing folder count
2. Show sticky banner with count + "Sync Now"
3. On click, batch-create folders with progress callback
4. Refresh status after sync

**Album backward compatibility** — The path change from `2082-10` to `MAGH EVENTS 2082` means any photos already uploaded under the old numeric prefix will not appear until re-uploaded or the folders are renamed in iDrive. This is expected since the user wants the new naming convention.

### Files to Create/Modify
| File | Action |
|------|--------|
| `supabase/functions/idrive-e2-api/index.ts` | Add `listRecursive` action |
| `src/lib/idrive-e2-api.ts` | Add `listE2FolderRecursive()` |
| `src/lib/e2-sync.ts` | New — sync check + batch create for E2 |
| `src/components/xito-drive/XitoDriveBrowser.tsx` | Label-based paths + sync banner |
| `src/components/client-detail/AlbumSection.tsx` | Update S3 prefix to label format |

