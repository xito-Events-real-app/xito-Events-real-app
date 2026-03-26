

# iDrive E2 Integration for XITO DRIVE

Connect the `wedding-tales-nepal` bucket on iDrive E2 to XITO DRIVE, enabling real folder creation, file uploads, and file browsing — mirroring the virtual folder structure into actual S3-compatible cloud storage.

## Architecture

```text
Browser  →  Edge Function (idrive-e2-api)  →  iDrive E2 S3 API
              ├── ListObjects (list folders/files)
              ├── PutObject (upload files)
              ├── PutObject with "/" suffix (create folder)
              └── DeleteObject
```

The edge function acts as a secure proxy — credentials never reach the browser.

## What Gets Built

### 1. Store iDrive E2 Credentials as Secrets
- `IDRIVE_E2_ENDPOINT` = `https://s3.eu-central-2.idrivee2.com`
- `IDRIVE_E2_ACCESS_KEY` = (provided)
- `IDRIVE_E2_SECRET_KEY` = (provided)
- `IDRIVE_E2_BUCKET` = `wedding-tales-nepal`
- `IDRIVE_E2_REGION` = `eu-central-2`

### 2. Create Edge Function: `supabase/functions/idrive-e2-api/index.ts`
A Deno edge function that signs S3 requests (AWS Signature V4) and proxies to iDrive E2. Supported actions:
- **list** — `GET /?prefix=...&delimiter=/` to list folders and files at a path
- **createFolder** — `PUT /{path}/` with empty body (S3 folder convention)
- **upload** — `PUT /{path}/{filename}` with file body (multipart forwarding)
- **delete** — `DELETE /{path}` to remove a file
- **getSignedUrl** — generate a pre-signed URL for direct file download/preview

S3 Signature V4 will be implemented manually in Deno (no AWS SDK needed — just HMAC-SHA256 signing).

### 3. Create Client API: `src/lib/idrive-e2-api.ts`
Frontend helpers that call the edge function:
- `listE2Folder(prefix: string)` — returns folders and files at a path
- `createE2Folder(path: string)` — creates a folder marker object
- `uploadToE2(path: string, file: File)` — uploads a file
- `deleteE2Object(path: string)` — deletes a file
- `getE2FileUrl(path: string)` — gets a signed download URL

### 4. Update `XitoDriveBrowser.tsx`
- Enable the "New Folder" button — prompts for folder name, calls `createE2Folder`
- Enable the "Upload" button — opens file picker, uploads to current path via `uploadToE2`
- At leaf levels (and all levels), merge virtual folders with real S3 objects from `listE2Folder`
- Show uploaded files as file cards (with download/preview on click)
- Auto-create the virtual folder structure in E2 on first navigation (lazy creation)

### 5. Update `XitoDriveFolderCard.tsx`
- Add file type support (not just folders) — show file icons for images/videos/documents
- Add file size display for real files from E2

### 6. Add to `supabase/config.toml`
```toml
[functions.idrive-e2-api]
verify_jwt = false
```

## S3 Path Mapping

Virtual breadcrumb path maps to S3 prefix:
```text
XITO DRIVE / MAGH EVENTS 2082 / Ishan Shakya / Photos / Wedding / Nikit
    →  S3 prefix: "2082-10/Ishan Shakya/Photos/Wedding/Nikit/"
```

The existing `buildStoragePath()` in `xito-drive-utils.ts` already sanitizes segments — it will be used to construct S3 prefixes.

## Key Design Decisions

- **Lazy folder creation**: Folders are only created in E2 when the user navigates into them or explicitly creates one — avoids mass-creating empty folders for every client
- **Hybrid view**: Virtual folders (from booked data) are always shown; real E2 contents are overlaid when present
- **Pre-signed URLs**: For file preview/download, the edge function generates time-limited signed URLs so the browser can stream directly from E2

