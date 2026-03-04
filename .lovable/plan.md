

## Plan: Add Device Name Filter to Files Table

### What
Click any storage device name pill (e.g., "W-T-N 17") in backup columns (1st, 2nd, 3rd) or Cloud column to filter and show only rows where that device is used. Same chip pattern as existing Day/Client filters.

### Changes — `src/components/files/FullScreenFilesTable.tsx`

1. **New state**: `const [filterDevice, setFilterDevice] = useState<string | null>(null)`

2. **Update `BackupPill`**: Add `onDeviceClick?: (name: string) => void` prop. On the device label `<span>`, add `onClick` with `e.stopPropagation()` that calls `onDeviceClick(deviceName)`.

3. **Update Cloud pill**: Same clickable behavior on the `drive_upload_path` span — clicking sets `setFilterDevice(drive_upload_path)`.

4. **Filter logic in `filteredRows`**: After day/client filters, when `filterDevice` is set, filter assignment rows to only those whose file records contain the device in any of: `backup_1_device_name`, `backup_2_device_name`, `backup_3_device_name`, or `drive_upload_path`. Uses `getFilesForRow(row)` to check.

5. **Filter chip in UI** (lines 684-701): Add device chip alongside Day/Client:
   ```
   {filterDevice && (
     <Badge variant="secondary" className="text-xs cursor-pointer" onClick={() => setFilterDevice(null)}>
       Device: {filterDevice} ✕
     </Badge>
   )}
   ```

6. **Update condition** on line 685: `(filterDay || filterClient || filterDevice)`

7. **Update "Clear all"** on line 698: add `setFilterDevice(null)`

8. **Pass `onDeviceClick={setFilterDevice}`** to all `BackupPill` instances (1st, 2nd, 3rd backup columns) and the Cloud pill.

