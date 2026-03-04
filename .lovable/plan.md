

## Plan: Revamp Assignment Row Summary Display

### What Changes
Replace the current collapsed row display from:
`17 | ABHINASH & SUBEKSHYA | GROOM RECEPTION | 5 | 2026-03-01`

To:
`17 | ABHINASH & SUBEKSHA | PHOTO W-T-N 9, VIDEO W-T-N-17 | GROOM RECEPTION | 2 FILES REMAINING | 5`

Key changes:
1. **Add 1st backup device summary** — grouped by PHOTO/VIDEO, showing unique device names used for 1st backup (`backup_1_device_name`)
2. **Replace file count with "remaining" status** — count files missing 1st backup (`final_generated_path` is empty). Show "X FILES REMAINING" in red or "ALL FILES COPIED" in green
3. **Remove the Date (AD) column** from both header and rows

### Changes — `src/components/files/FullScreenFilesTable.tsx`

**1. Desktop table header (lines 773-780)**
- Remove the "Date (AD)" column
- Change "Files" column to wider "Status" column
- Add new "1st Backup Devices" column between Event and Status

**2. Desktop row cells (lines 799-826)**
- Remove `row.eventDateAD` cell
- Add a new cell showing device summary: compute from `rowFiles` — group by PHOTO_ROLES/VIDEO_ROLES, get unique `backup_1_device_name` values, display as "PHOTO: W-T-N 9, VIDEO: W-T-N 17"
- Replace files count badge with remaining status:
  - Count files where `final_generated_path` is empty → remaining
  - If remaining > 0: red bold "X FILES REMAINING"
  - If remaining === 0: green bold "ALL FILES COPIED"

**3. Mobile row (lines 559-582)**
- Same changes: add device summary line, replace files badge with remaining status, remove date display

**4. Helper function** (new, near line 320):
```typescript
const getBackupDeviceSummary = (rowFiles: FileRecord[]): string => {
  const photoDevices = [...new Set(
    rowFiles.filter(f => PHOTO_ROLES.includes(f.freelancer_type) && f.backup_1_device_name)
      .map(f => f.backup_1_device_name)
  )];
  const videoDevices = [...new Set(
    rowFiles.filter(f => VIDEO_ROLES.includes(f.freelancer_type) && f.backup_1_device_name)
      .map(f => f.backup_1_device_name)
  )];
  const parts: string[] = [];
  if (photoDevices.length) parts.push(`PHOTO ${photoDevices.join(", ")}`);
  if (videoDevices.length) parts.push(`VIDEO ${videoDevices.join(", ")}`);
  return parts.join("  ·  ") || "—";
};

const getRemainingCount = (rowFiles: FileRecord[]): number => {
  return rowFiles.filter(f => !f.final_generated_path).length;
};
```

**5. Update `colSpan`** in expanded row (line 829) from 6 to match new column count (5 columns after removing Date, adding Devices)

