

# Auto-Push Storage Devices & Files to Google Sheets

## Overview
Remove the manual "Push to Sheets" buttons from the File Management page and instead implement automatic background push (same 3-second debounced pattern used by the client tracker).

## How It Works (Same Pattern as Client Tracker)
1. Every mutation (add/update/delete device or file) already sets `synced_to_sheet: false`
2. After each mutation, call `scheduleFilesPush()` which debounces for 3 seconds
3. The push function invokes the existing edge function actions (`pushStorageDevicesToSheet` and `pushFilesToSheet`) 
4. On success, rows are marked `synced_to_sheet: true` by the edge function

## Changes

### 1. Create push scheduler in `src/lib/files-push-scheduler.ts`
- New file following the exact same pattern as `clients-supabase-cache.ts` push scheduler
- `scheduleStoragePush()` -- 3-second debounced, single-flight guard, calls `pushStorageDevicesToSheets()`
- `scheduleFilesPush()` -- 3-second debounced, single-flight guard, calls `pushFilesToSheets()`
- Console logs for debugging (e.g. `[FILES-PUSH] Auto-pushed 5 files to Sheets`)

### 2. Wire auto-push into `useStorageDevices.ts`
- Import `scheduleStoragePush` from the new scheduler
- Call `scheduleStoragePush()` after every `add()`, `update()`, and `remove()` call
- Also set `synced_to_sheet: false` on add/update mutations in `files-api.ts`

### 3. Wire auto-push into `useFilesManagement.ts`
- Import `scheduleFilesPush` from the new scheduler
- Call `scheduleFilesPush()` after every `add()`, `update()`, `remove()`, and `generateRows()` call
- Files already set `synced_to_sheet: false` on inline edits (confirmed in FilesManagementTable)

### 4. Update `src/lib/files-api.ts`
- Ensure `addStorageDevice` and `updateStorageDevice` set `synced_to_sheet: false` 
- Ensure `deleteStorageDevice` triggers a push (devices removed from DB = removed from sheet on next push)
- Ensure `addFileRecord` sets `synced_to_sheet: false`

### 5. Clean up `src/pages/FileManagement.tsx`
- Remove the "Push to Sheets" buttons from both Storage and Files tabs
- Remove `handlePushStorageToSheets` and `handlePushFiles` functions
- Remove related state (`syncingStorage`, `pushingFiles`)
- Remove unused imports (`pushStorageDevicesToSheets`, `pushFilesToSheets`, `Upload`)

## Result
Storage devices and files will auto-push to Google Sheets within 3 seconds of any change, just like the client tracker -- no manual buttons needed.

