

# File Management Section -- Complete Redesign Plan

## Overview

Redesign the expanded file rows (when you click a client event like "ASHMI KC - PRE + RECEPTION") to match the reference image layout, plus overhaul the "Set File Path" dialog to support multi-backup tracking, card tabs, "who copied" dropdown, drive upload/link, and notes.

---

## Part 1: Database Changes

New columns needed on `files_management`:

- `backup_number` (integer, default 1) -- which backup this path record represents (1st, 2nd, 3rd)
- `drive_link` (text, nullable) -- Google Drive link for this file
- `notes` (text, nullable) -- free-text notes
- `confirmed` (boolean, default false) -- replaces the confusing `reconfirmation` field semantically

The existing `final_generated_path` stores backup 1 path. But for multi-backup (1st, 2nd, 3rd), we need a different approach:

**Option A**: Store all 3 backups as separate columns on the same row: `backup_1_path`, `backup_1_device_id`, `backup_2_path`, `backup_2_device_id`, `backup_3_path`, `backup_3_device_id`. This keeps one row per freelancer-card combo.

**Option B**: One row per backup entry (normalized).

**Recommendation: Option A** -- keeps the table flat, matches the reference image where each freelancer row shows all 3 backups inline. We rename/add columns:

```sql
ALTER TABLE files_management
  ADD COLUMN IF NOT EXISTS backup_1_device_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS backup_2_path text DEFAULT '',
  ADD COLUMN IF NOT EXISTS backup_2_device_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS backup_3_path text DEFAULT '',
  ADD COLUMN IF NOT EXISTS backup_3_device_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS drive_link text DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS confirmed boolean DEFAULT false;
```

The existing `final_generated_path` becomes `backup_1_path` (or we keep it and treat it as backup 1). The existing `double_backup`/`triple_backup` booleans become derived (non-empty path = backed up). The existing `drive_upload` boolean becomes derived from whether `drive_upload_path` is non-empty.

---

## Part 2: Expanded Row Layout (FullScreenFilesTable)

When expanding a client event (e.g., ASHMI KC - PRE + RECEPTION), files are grouped and displayed as:

### Grouping: PHOTOS section, then VIDEOS section
- **PHOTOS** header with distinct background (e.g., light green/teal)
- **VIDEOS** header with distinct background (e.g., light purple/blue)
- Separated by a thick divider line

### Row Columns (matching reference image):
```
| Role Badge | First Name (hover=full) | Format | Card | Size | Items | 1st | 2nd | 3rd | Drive Upload | Drive Link | Copied | Confirmed | Notes | SET FILE PATH |
```

Specifics:
- **Role Badge**: `VG` in a colored pill
- **First Name**: "ARJUN" (first name only), tooltip shows "ARJUN PANDEY"
- **Format**: Read-only display (e.g., "RAW+JPEG", "RAW")
- **Card**: Read-only display "Card 1" / "Card 2" etc.
- **Size**: Read-only "24GB"
- **Items**: Read-only "1250"
- **1st Backup**: Device short name in colored pill (e.g., "W-T-N-9") or red X
- **2nd Backup**: Device short name (e.g., "SAUGAT PC / E") or red X
- **3rd Backup**: Device short name or red X
- **Drive Upload**: Green check or red X
- **Drive Link**: "OPEN ME" clickable link or red X
- **Copied**: Name of who copied (e.g., "SAUGAT")
- **Confirmed**: Green checkmark or red X
- **Notes**: Pen icon, opens popup to view/write notes
- **SET FILE PATH**: Button that opens the path builder dialog

**All columns from Format through Copied are READ-ONLY on the table.** They can only be edited inside the "Set File Path" dialog.

Multiple cards for the same freelancer show as separate rows under the same freelancer name grouping.

---

## Part 3: Set File Path Dialog Redesign

### Top Header
- Shows which backup is being set: **"Setting 1st Backup"** / **"Setting 2nd Backup"** / **"Setting 3rd Backup"**
- Auto-detects: if `backup_1_path` is empty → 1st backup. If filled but `backup_2_path` empty → 2nd backup. Etc.
- Details bar: `CARD 1 — ASHMI KC — PRE — ARJUN PANDEY`

### Card Selection (NEW - at top, below details)
- Card count selector: how many cards (1-4)
- Tab buttons: `Card 1` | `Card 2` | etc.
- Each card tab has its own independent form data (storage type, device, path, size, items)
- If more than 1 card selected, all card forms must be filled before saving

### Storage & Path Section (existing, with fixes)
- **Storage Type dropdown**: `PC` / `HARD DRIVE` / `SSD` / `DRIVE` (fix: add SSD, DRIVE shows DRIVE devices not SSD)
- **Storage Device dropdown**: Filtered by selected storage type:
  - PC → devices where `device_type = 'PC'`
  - HARD_DRIVE → `device_type = 'HARD_DRIVE'`
  - SSD → `device_type = 'SSD'`
  - DRIVE → `device_type = 'DRIVE'`
- Rest of path config (year event folder, category, client/event folder, side, freelancer, card label) stays the same
- Generated path preview + copy button

### File Info Section
- File Size (GB) + No. of Items (same as now)

### NEW: Who Copied Section
- Searchable dropdown from all freelancers
- Priority names pinned at top: SAUGAT, JEEWAN, NIKIT, BARUN, ARJUN
- Option to type a new name (saved to `freelancers_cache` table)

### NEW: Drive Upload & Drive Link Section
- **Drive Upload**: Checkbox (uploaded yes/no)
- **Drive Link**: Text input for the Google Drive URL

### NEW: Notes Section
- Textarea for free-text notes about this file entry

### Save Behavior
- Saves path data to the correct backup slot (1st/2nd/3rd)
- If multiple cards selected, creates/updates separate `files_management` rows per card
- Each card's data saved independently

---

## Part 4: Storage Type Bug Fix

Current bug in `FilePathBuilderDialog` line 79:
```typescript
const typeMap = { PC: "PC", HARD_DRIVE: "HARD_DRIVE", DRIVE: "SSD" };
```
`DRIVE` incorrectly maps to `SSD`. Fix:
- Storage type options: PC, HARD_DRIVE, SSD, DRIVE
- Device filter mapping: each maps to its own `device_type` value
- Need to ensure `storage_devices` table supports `device_type = 'DRIVE'` (currently has PC, HARD_DRIVE, SSD)

---

## Part 5: Files Changed

1. **Database migration**: Add new columns (`backup_1_device_name`, `backup_2_path`, `backup_2_device_name`, `backup_3_path`, `backup_3_device_name`, `drive_link`, `notes`, `confirmed`)

2. **`src/lib/files-api.ts`**: Update `FileRecord` interface, update `buildFilePath` for SSD type, update `duplicateFileRowForCard`

3. **`src/components/files/FullScreenFilesTable.tsx`**: Complete rewrite of `FileRowsTable` -- group by PHOTOS/VIDEOS with different backgrounds, new column layout matching reference image, read-only display columns, first-name-only with tooltip, colored backup status pills, SET FILE PATH button

4. **`src/components/files/FilePathBuilderDialog.tsx`**: Major overhaul -- add backup number indicator, card tabs, fix storage type dropdown (add SSD/DRIVE), add "Who Copied" searchable dropdown with priority names, add Drive Upload/Link section, add Notes textarea, multi-card save logic

5. **`src/hooks/useFilesManagement.ts`**: Minor updates if needed for new fields

---

## Implementation Order

1. Database migration (new columns)
2. Fix `files-api.ts` types + storage type bug
3. Rebuild `FileRowsTable` in `FullScreenFilesTable.tsx` (PHOTOS/VIDEOS grouping, new columns, read-only display)
4. Rebuild `FilePathBuilderDialog.tsx` (backup tracking, card tabs, who copied, drive link, notes)
5. Test end-to-end

