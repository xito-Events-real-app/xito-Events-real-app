

# Push Storage Devices from Database to Google Sheets

## What This Does
Instead of pulling storage device data from sheets into the database, we reverse the flow: the database is the source of truth, and storage devices are automatically pushed to the WTN STORAGE spreadsheet tabs (HARD DRIVE, SSD, PC).

## Changes

### 1. Add `pushStorageDevicesToSheet` action to the edge function
- Read all devices from the `storage_devices` table grouped by type
- Clear existing data in each sheet tab (HARD DRIVE, SSD, PC) starting from row 2
- Write the database rows into the correct columns matching your sheet layout:
  - **HARD DRIVE / SSD**: A=Name, B=Total Storage, C=Remaining, D=Health, E=Safety, F=Speed, G=Purchase Date AD, H=Price, I=Purchased From
  - **PC**: A=PC Name, B=Drive Name, C=Total Storage, D=Remaining, E=Health, F=Safety, G=Speed, H=Purchase Date AD, I=Price, J=Purchased From

### 2. Replace "Sync from Sheets" button with "Push to Sheets"
- On the File Management page, change the Storage Devices tab button from "Sync from Sheets" to "Push to Sheets"
- It will call the new `pushStorageDevicesToSheet` action
- Update `files-api.ts` to add a `pushStorageDevicesToSheets()` function

### 3. Auto-push on device changes (optional trigger)
- After any add/update/delete of a storage device, mark `synced_to_sheet: false`
- The push action will send all devices (or we can keep manual push for now)

## Technical Details

### Edge function changes (`google-sheets/index.ts`)
- Add new action `pushStorageDevicesToSheet` to the action union type
- New function `pushStorageDevicesToSheetAction(accessToken)`:
  1. Query `storage_devices` table grouped by `device_type`
  2. For each sheet tab, clear rows A2:onwards using the Sheets API clear endpoint
  3. Write all devices for that type using `PUT` on the range
  4. Mark all devices as `synced_to_sheet: true`

### Frontend changes
- `src/lib/files-api.ts`: Add `pushStorageDevicesToSheets()` function calling the new action
- `src/pages/FileManagement.tsx`: Replace `handleSyncStorage` with push-to-sheets logic, update button label and icon
