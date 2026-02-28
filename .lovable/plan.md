

# Remaining File Management Tasks

## Task 1: Google Sheets Sync (Edge Function)

Add three new actions to `supabase/functions/google-sheets/index.ts`:

### 1A. `pullStorageDevices`
- Reads from the "WTN STORAGE" spreadsheet (needs a new secret `WTN_STORAGE_SPREADSHEET_ID` for the storage spreadsheet)
- Reads three sheets: "HARD DRIVE", "SSD", "PC"
- Maps each sheet's columns to `storage_devices` table fields
- Upserts by `device_name + device_type` to avoid duplicates
- Updates `synced_to_sheet = true` on upserted rows

### 1B. `pushFilesToSheet`
- Reads all `files_management` rows where `synced_to_sheet = false`
- Appends or updates them to the "FILES MANAGEMENT" sheet in WTN STORAGE spreadsheet
- Marks rows as `synced_to_sheet = true` after successful push
- Uses the existing `fetchWithRetry` pattern for rate limit handling

### 1C. `autoGenerateFileRows` (edge function version)
- This already exists in `src/lib/files-api.ts` as a client-side function
- Add a server-side version in the edge function for direct invocation if needed
- Can be skipped if the client-side version is sufficient (it currently works via direct database queries)

### Changes needed:
- **New secret**: `WTN_STORAGE_SPREADSHEET_ID` -- the spreadsheet ID for the WTN STORAGE Google Sheet
- **Modified file**: `supabase/functions/google-sheets/index.ts` -- add `pullStorageDevices` and `pushFilesToSheet` actions to the `SheetRequest` union and main handler
- **Modified file**: `src/lib/files-api.ts` -- add `syncStorageDevicesFromSheets()` and `pushFilesToSheets()` helper functions that call the edge function
- **Modified file**: `src/pages/FileManagement.tsx` -- add a "Sync Storage" button on the Storage Devices tab and a "Push to Sheets" button on the Files tab

---

## Task 2: Auto Card Increment

When auto-generating rows or manually adding file entries, card labels should auto-increment (e.g., CF1, CF2, RAW1, RAW2) for the same client + freelancer + format combination.

### Changes needed:
- **Modified file**: `src/lib/files-api.ts`
  - Add a `getNextCardLabel(clientName, freelancerName, formatType)` function
  - Queries existing `files_management` rows for that combo, extracts the highest numeric suffix, and returns the next increment
  - Integrate into `autoGenerateFileRows` so generated rows get incremented labels
- **Modified file**: `src/components/files/FilesManagementTable.tsx`
  - When format_type changes via inline edit, auto-suggest the next card label

---

## Implementation Order

1. Request the `WTN_STORAGE_SPREADSHEET_ID` secret from the user
2. Add edge function actions (`pullStorageDevices`, `pushFilesToSheet`)
3. Add client-side sync helpers and UI buttons
4. Implement auto card increment logic
5. Deploy and test

---

## Technical Details

### Edge Function Additions

The `SheetRequest` interface's `action` union type gets two new values: `'pullStorageDevices'` and `'pushFilesToSheet'`. Each action handler follows the existing pattern of authenticating via service account JWT, reading/writing via Google Sheets API v4, and upserting to the database.

### Secret Required

The user needs to provide the spreadsheet ID for the "WTN STORAGE" Google Sheet. This is separate from the existing `GOOGLE_SPREADSHEET_ID` (which is for the client tracker).

