

# Rebuild File Management: Complete System

This is a large production feature spanning database tables, edge functions, Google Sheets sync, and a full UI rebuild. The plan is split into phases to keep each step testable.

---

## Phase 1: Database Tables

Create two new tables with all specified columns:

### `storage_devices`
- `id` (uuid, PK)
- `device_type` (text: HARD_DRIVE / SSD / PC)
- `device_name` (text)
- `pc_drive_letter` (text, nullable)
- `total_storage_gb` (numeric)
- `used_storage_gb` (numeric, default 0)
- `remaining_storage_gb` (numeric, generated as total - used)
- `health_percent` (integer)
- `safety_status` (text: SAFE / UNSAFE / SLOW)
- `speed_rating` (integer, 1-5)
- `purchase_date_ad` (text)
- `purchase_date_bs` (text)
- `price_npr` (numeric)
- `purchased_from` (text)
- `synced_to_sheet` (boolean, default true)
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())
- RLS: Allow all (matching existing pattern)

### `files_management`
- `id` (uuid, PK)
- `registered_date_time_ad`, `registered_date_bs`, `client_name`
- `event_name`, `event_year`, `event_month`, `event_day`, `event_date_ad`
- `freelancer_type` (text -- the crew code like PB, VG, etc.)
- `freelancer_name`
- `storage_type` (text: PC / HARD_DRIVE / DRIVE)
- `storage_device_id` (uuid, FK -> storage_devices, nullable)
- `year_event_folder`, `category` (VIDEOS / PHOTOS)
- `client_folder_name`, `event_folder_name`, `side`, `card_label`
- `size_gb` (numeric), `number_of_items` (integer)
- `format_type` (text: RAW_ONLY / JPEG_ONLY / RAW_JPEG / CF / NORMAL / CF_NORMAL)
- `who_copied` (text)
- `reconfirmation` (boolean, default false)
- `double_backup` / `double_backup_path`
- `triple_backup` / `triple_backup_path`
- `drive_upload` / `drive_upload_path`
- `deleted_or_not` (boolean, default false)
- `final_generated_path` (text)
- `synced_to_sheet` (boolean, default true)
- `created_at`, `updated_at` (timestamptz)
- RLS: Allow all
- Enable realtime for both tables

### Database trigger
- On `files_management` INSERT/UPDATE of `size_gb`: auto-update `storage_devices.used_storage_gb` by summing all `files_management` rows referencing that device.

---

## Phase 2: Edge Function -- Google Sheets Sync

Add new actions to the existing `google-sheets` edge function:

### `pullStorageDevices`
- Read "HARD DRIVE", "SSD", "PC" sheets from WTN STORAGE spreadsheet (uses `WTN_SECRETS_SPREADSHEET_ID` or a new secret if needed)
- Map columns to `storage_devices` table
- Upsert by `device_name + device_type`

### `pushFilesToSheet`
- Read unsynced rows from `files_management`
- Append/update them to "FILES MANAGEMENT" sheet in WTN STORAGE spreadsheet
- Mark as synced

### `autoGenerateFileRows`
- Given a `registered_date_time_ad`, read `freelancer_assignments` for that client
- For each assigned crew member, create a `files_management` row with auto-populated fields:
  - `year_event_folder`: "{EVENT_MONTH} EVENTS {EVENT_YEAR}" (uppercase)
  - `category`: VIDEOS for VG/VB/DRONE/FPV/IPHONE, PHOTOS for PG/PB
  - `side`: auto-detect based on role code
  - `freelancer_type`: the crew code (PB, VG, etc.)

---

## Phase 3: Storage Devices UI

### New file: `src/components/files/StorageDevicesSection.tsx`
- Cards for each device showing name, type, storage bar (used/total), health %, safety badge
- Color-coded health: Green (>70%), Yellow (40-70%), Red (<40%)
- Warning indicators for remaining < 10% or UNSAFE status
- Add/Edit device drawer

### New file: `src/components/files/AddStorageDeviceDrawer.tsx`
- Form with all device fields
- Saves to database, triggers sheet sync in background

---

## Phase 4: Files Management Table UI

### New file: `src/components/files/FilesManagementTable.tsx`
- Main table showing all file rows for selected client/month
- Client selector (from booked clients with assignments)
- "Auto-Generate Rows" button that calls `autoGenerateFileRows`
- Inline editing for: storage type, device, card label, size, format, who_copied
- Checkbox columns for: reconfirmation, double_backup, triple_backup, drive_upload
- File path column that opens the Path Builder popup on click

### New file: `src/components/files/FilePathBuilderDialog.tsx`
- Modern blue-themed modal popup
- Fields: Storage Type, Storage Device Name, Year Event Folder, Category, Client Name, Event Name, Side, Freelancer Name, Card Label
- Live preview at bottom showing the generated path in the correct format:
  - PC: `\\PC_NAME\DRIVE:\YEAR EVENTS\CATEGORY\CLIENT\EVENT\SIDE\FREELANCER\CARD`
  - HARD_DRIVE: `HARD_DRIVE_NAME\MAIN_FOLDER_NAME\YEAR EVENTS\CATEGORY\CLIENT\EVENT\SIDE\FREELANCER\CARD`
  - DRIVE: `DRIVE_NAME\YEAR EVENTS\CATEGORY\CLIENT\EVENT\SIDE\FREELANCER\CARD`
- Copy button, validation, unsafe storage warning
- Save and Confirm button that writes `final_generated_path` + individual segments

---

## Phase 5: Rebuild FileManagement Page

### Rewrite: `src/pages/FileManagement.tsx`
- Professional blue-themed dashboard layout
- Tabs: "Dashboard" | "Storage Devices" | "Files"
- **Dashboard tab**: Stats hero (total files, storage used, devices count, warnings), quick links
- **Storage Devices tab**: `StorageDevicesSection` component
- **Files tab**: `FilesManagementTable` with client selector and auto-generate

---

## Phase 6: Automation Logic

### Auto card increment
- When adding a new file row for the same client + freelancer + format, auto-increment card labels (CF1, CF2, RAW1, RAW2, etc.)

### Storage auto-update
- Database trigger recalculates `used_storage_gb` and `remaining_storage_gb` on the referenced `storage_device` whenever `size_gb` changes in `files_management`

### Storage warnings
- UI shows red badge/alert when remaining storage < 10% of total
- UI shows warning when `safety_status = UNSAFE`

---

## New Files Summary

| File | Purpose |
|------|---------|
| `src/components/files/StorageDevicesSection.tsx` | Storage device cards with progress bars |
| `src/components/files/AddStorageDeviceDrawer.tsx` | Add/edit storage device form |
| `src/components/files/FilesManagementTable.tsx` | Main files table with inline editing |
| `src/components/files/FilePathBuilderDialog.tsx` | Modern path builder popup |
| `src/hooks/useStorageDevices.ts` | Hook for storage devices CRUD |
| `src/hooks/useFilesManagement.ts` | Hook for files management CRUD |
| `src/lib/files-api.ts` | API helpers for file operations |

## Modified Files

| File | Change |
|------|--------|
| `src/pages/FileManagement.tsx` | Complete rewrite with tabbed dashboard |
| `supabase/functions/google-sheets/index.ts` | Add storage/files sync actions |

---

## Technical Notes

- All writes follow the existing "Three-Layer Write Contract": instant local state, fast database update, background Sheets sync
- Realtime subscriptions on both new tables for multi-device sync
- The `WTN STORAGE` spreadsheet ID will need to be confirmed -- it may already exist as `WTN_SECRETS_SPREADSHEET_ID` or need a new secret
- The "BOOKED CLIENTS WTN FILES" sheet in WTN CLIENT TRACKER is read-only as a client source -- actual file data lives in `files_management`

