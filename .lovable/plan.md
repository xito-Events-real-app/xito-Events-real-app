

## Fix: HoverCard Popup on Backup Pills

### Root Cause
`BackupPill` is defined as a **nested function component** inside the main `FullScreenFilesTable` component (line ~245). Every render creates a new component reference, causing React to **unmount and remount** the HoverCard before the popup has a chance to appear.

### Fix
Extract `BackupPill` as a **standalone component outside** `FullScreenFilesTable`, passing the needed helpers (`getTimeAgo`, `getBackupTime`, `NEPALI_MONTH_NAMES`) as props or moving them outside the component too.

Specifically:
1. Move `getTimeAgo` and `getBackupTime` helper functions **outside** the component (they have no dependencies on component state)
2. Move `NEPALI_MONTH_NAMES` constant outside (it's already likely outside)
3. Extract `BackupPill` as a standalone `React.FC` defined **before** `FullScreenFilesTable`
4. Keep the same HoverCard JSX, just stable component identity

### File Changed
`src/components/files/FullScreenFilesTable.tsx`
- Move `getTimeAgo` (lines ~219-232) outside component
- Move `getBackupTime` (lines ~234-242) outside component  
- Move `BackupPill` (lines ~245-276) outside component as a standalone component

