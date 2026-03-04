

## Plan: Filter Individual File Rows (Not Just Assignment Rows)

### Problem
Currently, device/freelancer filters only filter at the **assignment row** (client+event) level. If any file in that event matches, ALL files for that event are shown. The user wants to see **only the specific file rows** where the device or freelancer is used.

### Fix — `src/components/files/FullScreenFilesTable.tsx`

**1. Update `getFilesForRow`** to apply device/freelancer filters on the individual file records:

Change `getFilesForRow` (~line 237) to also filter by `filterDevice` and `filterFreelancer` when active:

```typescript
const getFilesForRow = useCallback((row: AssignmentRow): FileRecord[] => {
  let rowFiles = files.filter(f =>
    f.registered_date_time_ad === row.registeredDateTimeAD &&
    f.event_name === row.event
  );
  if (filterDevice) {
    rowFiles = rowFiles.filter(f =>
      f.backup_1_device_name === filterDevice ||
      f.backup_2_device_name === filterDevice ||
      f.backup_3_device_name === filterDevice ||
      f.drive_upload_path === filterDevice
    );
  }
  if (filterFreelancer) {
    rowFiles = rowFiles.filter(f => f.freelancer_name === filterFreelancer);
  }
  return rowFiles;
}, [files, filterDevice, filterFreelancer]);
```

This single change ensures:
- When a device filter is active, only file rows using that device are shown
- When a freelancer filter is active, only that freelancer's file rows are shown
- Both filters can combine
- No other changes needed — the assignment-level filter in `filteredRows` already ensures only relevant events appear

