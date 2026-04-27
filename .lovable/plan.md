Paste this command into the target app chat: `Wedding Crew Connect`.

```text
Recreate the File Management system from my current Lovable project exactly, without missing anything.

Source project: 9f0d9b2f-f4d6-4e6f-83e5-718ff806cb09
Target project: this app, Wedding Crew Connect

Use cross-project tools to read the source project and copy/port the full File Management module. Do not approximate. Match the UI, logic, routes, tables, realtime behavior, storage-device logic, dashboard metrics, client detail page, and file-path builder behavior.

What to recreate:

1. Main routes and pages
- Add `/files` route for the full File Management module.
- Add `/files/client/:clientId` route for the client file detail page.
- Protect these routes with the same auth pattern used in this app.
- Add File Management entry/navigation if the target app has a suite/sidebar/menu.

2. Copy/port these source files and adapt imports only where needed
- `src/pages/FileManagement.tsx`
- `src/pages/FileClientDetail.tsx`
- `src/components/files/AddStorageDeviceDrawer.tsx`
- `src/components/files/CloudUploadDialog.tsx`
- `src/components/files/FileDashboardClientSheet.tsx`
- `src/components/files/FileManagementSidebar.tsx`
- `src/components/files/FilePathBuilderDialog.tsx`
- `src/components/files/FileReminderPopup.tsx`
- `src/components/files/FilesDashboard.tsx`
- `src/components/files/FilesManagementTable.tsx`
- `src/components/files/FullScreenFilesTable.tsx`
- `src/components/files/ReconfirmationDialog.tsx`
- `src/components/files/StorageDevicesSection.tsx`
- `src/components/files/WtnFilesAnnouncementDialog.tsx`
- `src/hooks/useFilesManagement.ts`
- `src/hooks/useFilesDashboardData.ts`
- `src/hooks/useStorageDevices.ts`
- `src/lib/files-api.ts`
- `src/lib/files-push-scheduler.ts`

Also port any UI/shared dependencies that are missing in the target app, including but not limited to:
- `src/components/booked/NepaliDateFilter.tsx`
- `src/lib/nepali-date.ts`
- `src/lib/sheets-api.ts` only if needed for `getCurrentStatus`
- any missing `src/components/ui/*` components used by the above files

3. Database tables to create with proper schema
Create/verify these Lovable Cloud database tables:

A) `storage_devices`
Columns:
- `id uuid primary key default gen_random_uuid()`
- `device_type text not null default 'HARD_DRIVE'`
- `device_name text not null default ''`
- `pc_drive_letter text`
- `total_storage_gb numeric not null default 0`
- `used_storage_gb numeric not null default 0`
- `remaining_storage_gb numeric generated always as (total_storage_gb - used_storage_gb) stored`
- `health_percent integer not null default 100`
- `safety_status text not null default 'SAFE'`
- `speed_rating integer not null default 3`
- `purchase_date_ad text default ''`
- `purchase_date_bs text default ''`
- `price_npr numeric default 0`
- `purchased_from text default ''`
- `cloud_type text default ''`
- `expiry_date_ad text default ''`
- `synced_to_sheet boolean default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

B) `files_management`
Columns:
- `id uuid primary key default gen_random_uuid()`
- `registered_date_time_ad text not null default ''`
- `registered_date_bs text default ''`
- `client_name text default ''`
- `event_name text default ''`
- `event_year text default ''`
- `event_month text default ''`
- `event_day text default ''`
- `event_date_ad text default ''`
- `freelancer_type text default ''`
- `freelancer_name text default ''`
- `storage_type text default ''`
- `storage_device_id uuid references public.storage_devices(id) on delete set null`
- `year_event_folder text default ''`
- `category text default ''`
- `client_folder_name text default ''`
- `event_folder_name text default ''`
- `side text default ''`
- `card_label text default ''`
- `size_gb numeric default 0`
- `number_of_items integer default 0`
- `format_type text default ''`
- `who_copied text default ''`
- `reconfirmation boolean default false`
- `double_backup boolean default false`
- `double_backup_path text default ''`
- `triple_backup boolean default false`
- `triple_backup_path text default ''`
- `drive_upload boolean default false`
- `drive_upload_path text default ''`
- `deleted_or_not boolean default false`
- `final_generated_path text default ''`
- `backup_1_device_name text default ''`
- `backup_2_path text default ''`
- `backup_2_device_name text default ''`
- `backup_3_path text default ''`
- `backup_3_device_name text default ''`
- `drive_link text default ''`
- `notes text default ''`
- `confirmed boolean default false`
- `backup_1_recorded_at timestamptz`
- `backup_2_recorded_at timestamptz`
- `backup_3_recorded_at timestamptz`
- `backup_history text default ''`
- `synced_to_sheet boolean default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

4. Database functions, triggers, realtime, RLS
- Enable RLS on `storage_devices` and `files_management`.
- Add authenticated-only ALL policies for both tables:
  - authenticated users can select/insert/update/delete.
- Create or reuse `public.update_updated_at_column()`.
- Create `public.update_storage_device_usage()` so `storage_devices.used_storage_gb` automatically recalculates from active `files_management` rows.
- Add trigger on `files_management` after insert/update/delete of size/device/deleted fields to update device usage.
- Add updated_at triggers for both tables.
- Enable realtime for both tables.
- Do not use public allow-all policies.

5. Required existing data dependencies
The file system auto-generates file rows from these existing tables. If the target app does not already have them, create or adapt equivalent data sources:
- `freelancer_assignments`
- `clients_cache`

The generation logic must use these fields from `freelancer_assignments`:
- `registered_date_time_ad`
- `client_name`
- `event`
- `event_year`
- `event_month`
- `event_day`
- `event_date_ad`
- `photographer_bride`
- `photographer_groom`
- `videographer_bride`
- `videographer_groom`
- `extra_photographer`
- `extra_videographer`
- `drone_operator`
- `fpv_operator`
- `iphone_shooter`
- `assistant`

Mapping must match source:
- `photographer_bride` -> PB / PHOTOS / BRIDE SIDE
- `photographer_groom` -> PG / PHOTOS / GROOM SIDE
- `extra_photographer` -> EP / PHOTOS
- `videographer_bride` -> VB / VIDEOS / BRIDE SIDE
- `videographer_groom` -> VG / VIDEOS / GROOM SIDE
- `extra_videographer` -> EV / VIDEOS
- `drone_operator` -> DRONE / VIDEOS
- `fpv_operator` -> FPV / VIDEOS
- `iphone_shooter` -> IPHONE / VIDEOS
- `assistant` -> ASST

6. Core behavior to preserve exactly
- `/files` has Dashboard, Storage Devices, and Files sections.
- Dashboard shows:
  - Today's Transfers
  - Total Copied
  - Files Pending
  - Double Backup
  - photo/video storage breakdowns
  - sub-filters by month/device
  - search by client/event/freelancer
  - activity feed and insights
- Storage section supports:
  - HARD_DRIVE, SSD, PC, CLOUD
  - device health, safety, speed, expiry for cloud, used/remaining storage
  - add/edit/delete device drawer
- Files section supports:
  - month filtering using Nepali months
  - auto-ensure rows from freelancer assignments for completed/past events
  - row editing for size, items, format, notes, copied by, backups
  - path builder dialog
  - card duplication for multi-card events
  - primary, secondary, tertiary backup paths
  - reconfirmation workflow
  - soft delete via `deleted_or_not`
  - realtime updates
- Client detail `/files/client/:clientId` groups rows by event and shows:
  - total size
  - photo size
  - video size
  - remaining files
  - per-event tables
  - photo roles first, then video roles
  - path hover cards
  - Set Path deep-link back to `/files`

7. File path builder behavior
Preserve the source behavior exactly:
- path segments: year event folder, category, client folder, event folder, side, freelancer name, card label
- PC path format uses `\\device\drive:\...`
- HDD/SSD/cloud style uses `device\...`
- 3-column layout: storage, cards, metadata
- searchable picker for Device, PC Name, and Drive Letter
- Card 1 is mandatory
- additional cards are soft-deleted if removed
- backup 2 and backup 3 are opt-in only and must not copy storage choices from primary backup unless explicitly selected

8. Sheet sync / backend function dependency
If the target app needs Google Sheet sync, port the `google-sheets` backend actions related to file management from the source function:
- `pullStorageDevices`
- `pushFilesToSheet`
- `pushStorageDevicesToSheet`

Also ensure the secret `WTN_STORAGE_SPREADSHEET_ID` exists in the target app. If missing, ask me to provide it before enabling sheet push. If sheet sync is not available yet, keep the UI/database working and make scheduler failures non-blocking.

9. Important technical rules
- Do not edit generated Lovable Cloud client/type files manually.
- Use migrations only for schema creation/changes.
- Use authenticated RLS policies for admin file-management tables.
- Preserve Supabase/Lovable Cloud-first reads and writes.
- Keep `registered_date_time_ad` as the identity key linking clients, freelancer assignments, and file rows.
- Run TypeScript/build checks after implementation and fix all errors.

Expected final result:
The Wedding Crew Connect app should have the exact same File Management system as the source app, including database tables, storage-device tracking, file-row generation from crew assignments, dashboard, storage UI, file table, client file detail page, path builder, backups, realtime behavior, and optional sheet sync.
```