

# New Module: Edited Files (Drive-style File Storage with Links)

## Overview
A new "Edited Files" module — a Google Drive-style interface for uploading edited photos/videos per client, organized in a folder hierarchy. Also supports saving external links (YouTube, Google Drive, pCloud, etc.) inside each client folder. Files upload to Supabase Storage for now (pCloud later).

## Folder Structure
```text
Root/
├── Client A/
│   ├── Photos/
│   │   └── Wedding/
│   │       ├── Bride Side/
│   │       │   └── file1.jpg, file2.jpg...
│   │       └── Groom Side/
│   └── Videos/
│   │   └── video1.mp4...
│   └── Links/        (virtual — stored in DB, shown in UI)
│       ├── YouTube: https://youtube.com/...
│       ├── Google Drive: https://drive.google.com/...
│       └── pCloud: https://pcloud.com/...
├── Client B/
│   └── ...
```

## Database

### Table: `edited_files`
| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| registered_date_time_ad | text | NOT NULL |
| client_name | text | '' |
| file_type | text | 'photo' (photo/video) |
| event_name | text | '' |
| folder_event_name | text | '' |
| side_folder | text | '' |
| photographer_name | text | '' |
| file_name | text | '' |
| file_path | text | '' (virtual display path) |
| storage_path | text | '' (bucket path) |
| file_size_bytes | bigint | 0 |
| mime_type | text | '' |
| upload_status | text | 'uploading' |
| upload_progress | integer | 0 |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

### Table: `edited_files_links`
| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| registered_date_time_ad | text | NOT NULL |
| client_name | text | '' |
| link_type | text | '' (youtube/gdrive/pcloud/other) |
| link_url | text | '' |
| link_title | text | '' |
| notes | text | '' |
| created_at | timestamptz | now() |
| updated_at | timestamptz | now() |

### Storage Bucket: `edited-files`
Public bucket for JPG/MP4 uploads.

RLS: Allow all access (matching existing pattern).

## Files to Create

### 1. `src/pages/EditedFiles.tsx`
Main page with:
- Dashboard view: recent uploads, storage stats, client folder cards
- Folder browser: click client → Photos/Videos/Links → subfolders → files
- Upload button (opens wizard)
- Add Link button (inside client folders)

### 2. `src/components/edited-files/FolderBrowser.tsx`
Drive-style navigation with breadcrumb path. Shows folders as cards/icons. At file level shows thumbnails/filenames with download buttons.

### 3. `src/components/edited-files/UploadWizard.tsx`
Step-by-step dialog:
1. Select client (search from `clients_cache` where `sheet_source='booked'`)
2. Photo or Video (two big buttons)
3. **Photo path**: Select event → suggest folder name (strip "BS"/"GS") → select photographer/side → confirm path
4. **Video path**: Just `Client \ Videos` — skip to confirm
5. File picker (multi-file drag-drop) + upload with progress

### 4. `src/components/edited-files/UploadProgressTracker.tsx`
Fixed bottom-right widget showing active uploads with progress bars. Persists across navigation via React Context.

### 5. `src/components/edited-files/EditedFilesUploadContext.tsx`
React Context to hold upload queue state across page navigation.

### 6. `src/components/edited-files/AddLinkDialog.tsx`
Dialog to add external links to a client folder:
- Link type selector: YouTube, Google Drive, pCloud, Other
- URL input
- Title/label input
- Notes (optional)
- Each link type gets a colored icon (red for YouTube, blue for Drive, green for pCloud)

### 7. `src/components/edited-files/ClientLinksSection.tsx`
Renders saved links inside a client's folder view — clickable cards with icons, titles, and open-in-new-tab buttons. Edit/delete options.

### 8. `src/lib/edited-files-api.ts`
CRUD for `edited_files` and `edited_files_links` tables. Upload to Supabase Storage bucket. Helper to generate storage paths.

## Files to Edit

### 9. `src/App.tsx`
- Import `EditedFiles` page
- Add route: `/edited-files`

### 10. `src/lib/suite-modules.ts`
- Add module entry with `HardDrive` icon, path `/edited-files`, teal gradient, status `active`

## Upload Flow Detail

**Event name suggestion logic:**
- "Wedding BS" → suggest "Wedding" (strip trailing BS/GS/day suffixes)
- "Mehndi" → suggest "Mehndi" (no change needed)

**Side folder suggestion logic:**
- From `freelancer_assignments`: photographer with role containing "PB" or "EP" → "Bride Side"
- Role containing "PG" → "Groom Side"

**Path preview:** `Prasanna Mainali \ Photos \ Wedding \ Bride Side \` — editable before upload

## Links Feature Detail

Inside each client's folder view, a "Links" tab/section shows:
- Saved external links grouped by type (YouTube, Google Drive, pCloud, Other)
- Each link: colored icon + title + URL (truncated) + open button
- "Add Link" button opens `AddLinkDialog`
- Can edit title/notes or delete links

## Technical Notes
- Storage path format: `{registered_date_time_ad}/{photo|video}/{event_folder}/{side_folder}/{filename}`
- Upload uses `supabase.storage.from('edited-files').upload()` with progress tracking via `XMLHttpRequest`
- Context provider wraps the app in `App.tsx` to persist uploads across navigation
- Data from `clients_cache` (booked), `event_details_cache`, and `freelancer_assignments` used in wizard
- For now limited to JPG and MP4; storage is Supabase (pCloud integration later)

