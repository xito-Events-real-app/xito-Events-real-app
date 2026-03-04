

## Add Edit Buttons Next to Backup Pills

### What
Add a small edit (pencil) icon button next to each backup pill (1st, 2nd, 3rd) and Drive column. The button only appears when the backup data exists (path is present for backups, `drive_upload` is true for Drive).

### How

**File: `src/components/files/FullScreenFilesTable.tsx`**

1. **Desktop table rows (lines ~366-389)**: For each of the 4 cells (1st, 2nd, 3rd, Drive), wrap the existing content in a flex container and add a small `PenLine` icon button that calls `openPathBuilder(file)` — only rendered when the backup/drive data exists.

   - **1st backup cell**: Show edit button when `file.final_generated_path` is truthy
   - **2nd backup cell**: Show edit button when `file.backup_2_path` is truthy
   - **3rd backup cell**: Show edit button when `file.backup_3_path` is truthy
   - **Drive cell**: Show edit button when `file.drive_upload` is true

2. **Mobile card rows (lines ~496-511)**: Same logic — add a small edit icon next to each backup pill and drive status, only when data exists.

The edit button will open the existing `FilePathBuilderDialog` via `openPathBuilder(file)`, which already supports editing all backup paths and drive settings.

### Visual
Each cell becomes: `[BackupPill] [✏️]` — the pencil icon is tiny (w-3 h-3), muted by default, blue on hover, keeping the table compact.

