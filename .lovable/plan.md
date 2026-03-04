

## Changes to FilePathBuilderDialog

Three modifications in `src/components/files/FilePathBuilderDialog.tsx`:

### 1. Hide "Who Copied" section for 2nd and 3rd backups
The "Who Copied" dropdown and "Add new name" input in Column 3 (Amber section, lines 728-757) should only render when `backupNumber === 1`. For backup 2 and 3, hide the entire who-copied UI since only the first person's name matters.

### 2. Clear storage type and device for 2nd backup
When `backupNumber === 2`, the Storage Type and Device fields in Column 1 should start empty (they already do from the reset logic). No pre-population from the first backup's values.

This is already the behavior since the dialog opens fresh per backup slot. No change needed here.

### 3. Add same-device validation warning
Add a validation check: when saving backup 2 or 3, compare the selected device against the device used in prior backups (from `fileRecord`). If the same device is selected, show a toast error and block the save.

Specifically in `handleSave`:
- For backup 2: check if selected `deviceId` matches the device from `final_generated_path` / `backup_1_device_name`
- For backup 3: check if selected `deviceId` matches backup 1 or backup 2 devices

To do device comparison, look up device name from `devices` array using the selected `deviceId` and compare against `fileRecord.backup_1_device_name` and `fileRecord.backup_2_device_name`.

### Technical details

**File**: `src/components/files/FilePathBuilderDialog.tsx`

1. **Lines 728-757**: Wrap the "Who Copied" section in a `{backupNumber === 1 && (...)}` conditional
2. **Lines 309-324 (handleSave)**: Add device duplicate check before proceeding:
   ```typescript
   if (backupNumber >= 2) {
     const selectedDeviceName = devices.find(d => d.id === form.deviceId)?.device_name;
     if (backupNumber === 2 && selectedDeviceName && selectedDeviceName === fileRecord.backup_1_device_name) {
       toast.error("2nd backup cannot be on the same device as 1st backup!");
       return;
     }
     if (backupNumber === 3 && selectedDeviceName && 
         (selectedDeviceName === fileRecord.backup_1_device_name || selectedDeviceName === fileRecord.backup_2_device_name)) {
       toast.error("3rd backup cannot be on the same device as 1st or 2nd backup!");
       return;
     }
   }
   ```

