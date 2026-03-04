

## Plan: Move Drive Upload to Cloud Column with Cloud Device Selection

### Summary
Remove the "Drive Upload" section from the FilePathBuilderDialog. Rename the "Drive" column to "Cloud" in the files table. Clicking "Cloud" opens a dedicated dialog for cloud backup with cloud device selection, drive link input, and remove cloud backup capability.

### Changes

**1. `src/components/files/FilePathBuilderDialog.tsx`**
- Remove the entire "Drive Upload" purple sub-section (lines 795-806) — the checkbox and drive link input
- Remove `driveUpload` and `driveLink` state variables and their usage in `handleSave`
- No longer save `drive_upload` or `drive_link` from this dialog

**2. New component: `src/components/files/CloudUploadDialog.tsx`**
- A new dialog similar in style to FilePathBuilderDialog but simpler
- Fields:
  - **Storage Type**: Pre-set to "CLOUD" (read-only)
  - **Cloud Name**: Dropdown of cloud devices from `storage_devices` where `device_type === "CLOUD"`, showing `device_name`
  - **Drive Link**: Text input for the link URL
- On save: updates `drive_upload = true`, `drive_link`, and a new field for the cloud device name (we'll use `drive_upload_path` to store the cloud device name since it exists and is unused)
- Has a "Remove Cloud Backup" button when editing an existing cloud backup
- On remove: clears `drive_upload`, `drive_link`, `drive_upload_path`

**3. `src/components/files/FullScreenFilesTable.tsx`**
- Rename "Drive" column header to "Cloud"
- Change the Drive cell: instead of showing a checkmark, show the cloud device name (from `drive_upload_path`) as a pill similar to BackupPill, with hover showing details + edit icon
- When clicked (or edit icon), open the new `CloudUploadDialog`
- "Link" column stays the same (shows "OPEN" with the `drive_link`)

**4. `supabase/functions/google-sheets/index.ts`**
- Rename header `'DRIVE UPLOAD'` → `'CLOUD NAME'`
- Change `mapRow`: instead of `f.drive_upload ? 'TRUE' : 'FALSE'`, output `f.drive_upload_path || ''` (the cloud device name)
- `DRIVE LINK` header stays the same

### Files to modify
1. `src/components/files/FilePathBuilderDialog.tsx` — remove Drive Upload section
2. `src/components/files/CloudUploadDialog.tsx` — new file
3. `src/components/files/FullScreenFilesTable.tsx` — rename column, add cloud dialog integration
4. `supabase/functions/google-sheets/index.ts` — update header and mapping

