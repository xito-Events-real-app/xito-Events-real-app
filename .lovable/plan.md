

## Fix: Edit Button Should Open the Specific Backup Number

### Problem
All edit buttons call `openPathBuilder(file)` without specifying which backup to edit. The dialog then auto-calculates `getNextBackupNumber(file)`, which always picks the *next empty* slot — so clicking edit on backup 1 opens backup 2 instead.

### Solution

**1. `FullScreenFilesTable.tsx`**
- Add state: `editBackupNumber: number | null` (default `null`)
- Change `openPathBuilder` to accept a second param: `openPathBuilder(file, backupNum)`
- Pass `editBackupNumber` as a new prop to `FilePathBuilderDialog`
- Update all edit button calls:
  - 1st backup edit → `openPathBuilder(file, 1)`
  - 2nd backup edit → `openPathBuilder(file, 2)`
  - 3rd backup edit → `openPathBuilder(file, 3)`
  - Drive edit → `openPathBuilder(file, 0)` (or keep as-is, drive doesn't use backup number)
  - "SET PATH" button → `openPathBuilder(file)` (no override, uses auto-detect)

**2. `FilePathBuilderDialog.tsx`**
- Add optional prop: `initialBackupNumber?: number`
- Change `backupNumber` logic: if `initialBackupNumber` is provided, use it directly instead of `getNextBackupNumber(file)`
- Pre-populate the form fields from the existing backup data when editing (e.g., if editing backup 1, load `final_generated_path` and `backup_1_device_name` into the form)

### Files Changed
- `src/components/files/FullScreenFilesTable.tsx` — pass backup number to dialog
- `src/components/files/FilePathBuilderDialog.tsx` — accept and use `initialBackupNumber` prop

