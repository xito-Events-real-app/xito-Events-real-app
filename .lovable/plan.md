

# pCloud Integration for Edited Files Module

## Overview
Integrate pCloud's API (US region, access token auth) to enable browsing, uploading, and creating folders directly from the Edited Files module. The app will use pCloud as the primary file storage instead of Supabase Storage.

## Architecture

```text
Frontend (React)
    ↓ supabase.functions.invoke()
Edge Function (pcloud-api)
    ↓ fetch() with access token
pCloud API (api.pcloud.com)
```

All pCloud API calls go through a single edge function to keep the access token server-side.

## Step 1: Store pCloud Access Token
- Use `add_secret` tool to request `PCLOUD_ACCESS_TOKEN` from the user
- User gets this from pCloud Settings → App Tokens or OAuth flow

## Step 2: Create Edge Function `supabase/functions/pcloud-api/index.ts`
A proxy edge function that handles these operations:

| Action | pCloud API Endpoint |
|--------|-------------------|
| List folder contents | `GET /listfolder?folderid=X` |
| Create folder | `POST /createfolder?folderid=X&name=Y` |
| Upload file | `POST /uploadfile?folderid=X` (multipart) |
| Get file link | `GET /getfilelink?fileid=X` |
| Get thumbnails | `GET /getthumblink?fileid=X&size=WxH` |

The edge function accepts a JSON body `{ action, params }` and routes to the correct pCloud endpoint with the stored access token.

## Step 3: Create `src/lib/pcloud-api.ts`
Client-side wrapper that calls the edge function:
- `listPCloudFolder(folderId: number)` — returns folders and files
- `createPCloudFolder(parentId: number, name: string)` — creates a folder
- `uploadToPCloud(folderId: number, file: File)` — uploads a file
- `getPCloudThumbUrl(fileid: number)` — gets thumbnail URL
- `getPCloudFileLink(fileid: number)` — gets download link

## Step 4: Update Dashboard (`src/pages/EditedFiles.tsx`)
- Add a "pCloud" view tab alongside Dashboard and Browse
- pCloud view shows the root folder contents from pCloud
- Display folder cards (with file counts) and file thumbnails
- Clicking a folder navigates into it (breadcrumb navigation)

## Step 5: Update `FolderBrowser.tsx`
- Add a toggle or tab to switch between "Local (Supabase)" and "pCloud" views
- pCloud mode uses `listPCloudFolder()` to show real pCloud folder structure
- Support creating new folders via a "New Folder" button that calls `createPCloudFolder()`

## Step 6: Update Upload Wizard (`UploadWizard.tsx`)
- Add a storage destination picker: "Local" or "pCloud"
- When pCloud is selected, the wizard:
  - Lists pCloud folders to let user pick destination
  - Shows a "Create Folder" option within the picker
  - Uploads directly to pCloud via the edge function
  - Still saves metadata to `edited_files` table (with `storage_path` pointing to pCloud)

## Step 7: Add `pcloud_file_id` column to `edited_files` table
- New column to track pCloud file IDs for thumbnail/download lookups
- Add `storage_type` column: `'supabase'` or `'pcloud'` to distinguish where files live

## Files to Create
1. `supabase/functions/pcloud-api/index.ts` — Edge function proxy
2. `src/lib/pcloud-api.ts` — Client-side API wrapper

## Files to Edit
1. `src/pages/EditedFiles.tsx` — Add pCloud dashboard view
2. `src/components/edited-files/FolderBrowser.tsx` — pCloud folder browsing + create folder
3. `src/components/edited-files/UploadWizard.tsx` — pCloud upload destination
4. `src/lib/edited-files-api.ts` — Handle pCloud file URLs/thumbnails
5. Migration: Add `storage_type` and `pcloud_file_id` columns to `edited_files`

## Technical Notes
- pCloud US API base: `https://api.pcloud.com`
- Auth header: `Authorization: Bearer {PCLOUD_ACCESS_TOKEN}`
- Thumbnails via `getthumblink` API (returns temporary URL)
- File uploads use multipart form data to pCloud's `uploadfile` endpoint
- Root folder ID in pCloud is `0`; we can let users configure a base folder

