

## Fix Backup Hover Popup — Per-Backup Timestamps

### Problem
The hover popup on backup pills uses `file.updated_at` (row-level timestamp) for the "time ago" display. This means ALL backup pills show the same time — whenever any field on the row was last changed, not when that specific backup was recorded.

### Solution

**1. Add per-backup timestamp columns (DB migration)**

Add 3 new columns to `files_management`:
- `backup_1_recorded_at` (timestamptz, nullable)
- `backup_2_recorded_at` (timestamptz, nullable)
- `backup_3_recorded_at` (timestamptz, nullable)

**2. Update `FilePathBuilderDialog.tsx`**

When saving a backup path, also set the corresponding `backup_X_recorded_at = now()` timestamp. This records exactly when that specific backup was created/updated.

**3. Update `BackupPill` in `FullScreenFilesTable.tsx`**

- Accept `backupNum` and use it to pick the correct per-backup timestamp:
  - Backup 1 → `file.backup_1_recorded_at`
  - Backup 2 → `file.backup_2_recorded_at`
  - Backup 3 → `file.backup_3_recorded_at`
  - Falls back to `file.updated_at` if the per-backup timestamp is null
- Show cleaner hover structure:
  - **Line 1**: Device name (bold, emerald)
  - **Line 2**: Full path in monospace box
  - **Line 3**: Clock icon + "3 days 12 hrs 56 mins ago" (bold)

**4. Update `files-api.ts`**

Add the new timestamp fields to the `FileRecord` interface so TypeScript is happy.

### Files Changed
- DB migration (3 new columns)
- `src/components/files/FullScreenFilesTable.tsx` — use per-backup timestamp in `BackupPill`
- `src/components/files/FilePathBuilderDialog.tsx` — set `backup_X_recorded_at` on save
- `src/lib/files-api.ts` — add new fields to `FileRecord` type

