

## Plan: Rename Root Folder + Add Smart Sync with Pending Changes Banner

### What Changes

1. **Rename root folder** from `wedding-tales-nepal` to `WEDDING TALES NEPAL` everywhere
2. **Track pending changes** — detect when new clients/events/freelancers exist that don't have pCloud folders yet
3. **Show a banner** at the top of the pCloud module showing "X new changes pending sync" with a sync button
4. **First sync** creates the entire `WEDDING TALES NEPAL` folder tree from scratch
5. **Subsequent syncs** only create the missing folders (the API is already idempotent — `createfolderifnotexists` skips existing folders)

### Files to Modify

**1. `src/lib/xito-drive-utils.ts`** — Change `PCLOUD_ROOT`
- Change `const PCLOUD_ROOT = "wedding-tales-nepal"` to `const PCLOUD_ROOT = "WEDDING TALES NEPAL"`
- Everything downstream (tree builders, paths) automatically uses the new name

**2. `src/components/pcloud-drive/PCloudDriveBrowser.tsx`** — Add pending changes detection + banner
- On mount, call `listPCloudFolderByPath("/WEDDING TALES NEPAL")` to get existing folder structure
- Compare `buildPCloudFolderTree(clients, assignments)` paths against what actually exists in pCloud
- Count the difference as "pending changes"
- Show a sticky banner: "5 new folders pending sync — Freelancer X added, Client Y added" with a "Sync Now" button
- After sync completes, re-check and hide banner if 0 pending
- Update breadcrumb root label from "wedding-tales-nepal" to "WEDDING TALES NEPAL"
- Update the path builder from `"wedding-tales-nepal"` to `"WEDDING TALES NEPAL"`

**3. `src/lib/pcloud-sync.ts`** — Add a function to detect pending changes
- Add `getPendingSyncPaths(clients, assignments, existingPaths): string[]` that returns only paths not yet in pCloud
- Add `checkPCloudSyncStatus(clients, assignments): Promise<{ pending: number; paths: string[]; summary: string[] }>` that:
  1. Recursively lists the `WEDDING TALES NEPAL` folder in pCloud
  2. Builds the expected tree from client data
  3. Returns the diff (missing paths) with human-readable summaries like "New client: Karishma Shrestha", "New freelancer: Ram for Wedding"

**4. `src/lib/pcloud-api.ts`** — Add recursive listing helper
- Add `listPCloudFolderRecursive(path): Promise<Set<string>>` that walks the pCloud tree and returns all existing folder paths as a flat set (used for diff detection)

### How the Banner Works

```text
┌─────────────────────────────────────────────────┐
│ ⚠ 5 new changes pending sync                   │
│   • New client: Karishma Shrestha (2082-10)     │
│   • New freelancer: Ram added to Wedding        │
│                              [Sync Now]         │
└─────────────────────────────────────────────────┘
```

- Checked on page load (async, non-blocking)
- Re-checked after each sync completes
- Shows count + up to 3 change summaries
- "Sync Now" triggers the existing `syncPCloudDriveFolders` but only with the missing paths

### Technical Notes

- `createfolderifnotexists` is idempotent — running sync on already-existing folders is harmless but wastes API calls. The diff check avoids this.
- Recursive listing depth is limited to 3 levels (root → year-month → client) for speed. Deeper checks happen per-client only when needed.
- The root folder name `WEDDING TALES NEPAL` will be created automatically on first sync if it doesn't exist.

