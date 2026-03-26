

## Plan: Mirror XITO DRIVE Folder Structure in pCloud

### What This Does

Creates the exact same folder hierarchy in pCloud that exists in XITO DRIVE (iDrive E2), under a root folder called `wedding-tales-nepal`. New clients and events will automatically get folders created in both storages going forward.

```text
pCloud Root/
  wedding-tales-nepal/
    2082-10/
      Client Name/
        Photos/
          Wedding/
            Photographer Name/
          Selected/
        Videos/
          Highlights/
          Reels/
          Full Videos/
        Quotation/
        Payments/
        Project Managers/
          Wedding/
        Lightroom Catalog/
          Wedding/
            Photographer Name/
```

### Files to Modify

**1. `src/lib/pcloud-api.ts`** — Add path-based folder creation
- Add `createPCloudFolderByPath(path: string)` using pCloud's `/createfolderifnotexists` API which accepts full paths (e.g. `/wedding-tales-nepal/2082-10/ClientName/Photos`)
- Add `listPCloudFolderByPath(path: string)` for path-based listing
- These use the direct browser API (already have auth token cached)

**2. `src/lib/xito-drive-utils.ts`** — Add folder tree builder
- Add `buildFullFolderTree(clients, assignments)` that returns an array of all folder paths that should exist (e.g. `["wedding-tales-nepal/2082-10", "wedding-tales-nepal/2082-10/ClientName", ...]`)
- Reuses existing `buildMonthYearGroups`, `getClientCategories`, `getFreelancersForEvent` logic

**3. `src/lib/pcloud-sync.ts`** — New file for sync logic
- `syncAllFoldersToPCloud(clients, assignments, onProgress?)` — iterates through the full folder tree and calls `createfolderifnotexists` for each path
- Uses batched parallel requests (5-10 at a time) to avoid rate limiting
- Reports progress (e.g. "Creating folder 15/120...")

**4. `src/components/xito-drive/XitoDriveBrowser.tsx`** — Dual-write + sync button
- Add a "Sync to pCloud" button in the toolbar (cloud icon)
- When user clicks "New Folder" in XITO DRIVE, also create the same folder in pCloud under `wedding-tales-nepal/` prefix
- Show sync progress toast/indicator

### Technical Details

pCloud's `createfolderifnotexists` API:
```typescript
// Creates folder at path, creating parents as needed — returns existing folder if already there
await callPCloudDirect('/createfolderifnotexists', { path: '/wedding-tales-nepal/2082-10/ClientName/Photos' });
```

Dual-write on folder creation:
```typescript
const handleCreateFolder = async () => {
  const name = prompt("Enter folder name:");
  // Create in iDrive E2 (existing)
  await createE2Folder(currentS3Prefix + name);
  // Also create in pCloud (new)
  await createPCloudFolderByPath(`/wedding-tales-nepal/${currentS3Prefix}${name}`);
};
```

Full sync builds paths from client data:
```typescript
function buildFullFolderTree(clients, assignments): string[] {
  const paths: string[] = [];
  const groups = buildMonthYearGroups(clients);
  for (const group of groups) {
    paths.push(`wedding-tales-nepal/${group.key}`);
    for (const client of group.clients) {
      const base = `wedding-tales-nepal/${group.key}/${client.clientName}`;
      paths.push(base);
      for (const cat of getClientCategories()) {
        paths.push(`${base}/${cat.name}`);
        // Add event/freelancer subfolders per category...
      }
    }
  }
  return paths;
}
```

