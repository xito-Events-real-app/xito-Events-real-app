

## Revamp Dashboard Status Cards — 4 Enhanced Cards with Sub-Filters

### Current State
4 cards: Recently Copied, Files Pending, Double Backup Pending, Storage Today. Each toggles a simple filter. No size info on cards, no sub-filters.

### New Card Design

**Card 1: "Today's Transfers"** (Green)
- Shows: count + total GB (e.g. "12 files • 45.2 GB")
- Click: filters to today's copied files

**Card 2: "Total Copied"** (Blue)  
- Shows: count + total GB of all files with `final_generated_path`
- Click: filters to all copied files
- Sub-filters appear above table: by month (`event_month`/`event_year`), by device (`backup_1_device_name`)

**Card 3: "Files Pending"** (Red)
- Shows: count of files without `final_generated_path`
- Click: filters to pending files
- Sub-filters: by month, by event name

**Card 4: "Double Backup"** (Yellow/Amber)
- Shows: done count / remaining count (e.g. "8 Done • 15 Remaining")
- Click: shows sub-filter toggle — "Done" vs "Remaining"
  - Done = files with `backup_2_path`
  - Remaining = files with `final_generated_path` but no `backup_2_path`
- Additional sub-filters: by month, by device

### Implementation

**1. `src/hooks/useFilesDashboardData.ts`**
- Update `DashboardStats` interface:
  ```typescript
  todayCopied: number;
  todayCopiedGB: number;
  totalCopied: number;
  totalCopiedGB: number;
  filesPending: number;
  doubleBackupDone: number;
  doubleBackupRemaining: number;
  ```
- Update `FilterMode` type: `"all" | "today" | "copied" | "pending" | "backup_done" | "backup_remaining"`
- Add filter cases for the new modes
- Expose `allFiles` for sub-filter computation (already exposed)

**2. `src/components/files/FilesDashboard.tsx`**
- Update `STATUS_CARDS` array with new names, values, colors
- Card 4 shows two numbers ("Done • Remaining") instead of one
- Add **sub-filter bar** between cards and table:
  - Only visible when a card filter is active
  - Shows month pills (derived from filtered files' `event_year`/`event_month`)
  - For "Double Backup": shows "Done" / "Remaining" toggle pills
  - For "Total Copied": shows device name pills
  - Each pill toggles a secondary filter applied on top of the card filter
- Add local state: `subFilterMonth`, `subFilterDevice`, `backupSubMode` ("done" | "remaining")
- Apply sub-filters in a `useMemo` between `files` (from hook) and rendered rows

### Files Changed
- `src/hooks/useFilesDashboardData.ts`
- `src/components/files/FilesDashboard.tsx`

