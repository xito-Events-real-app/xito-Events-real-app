

# "Copy HQ Album Photos" Gear Button Feature

## What gets built

A circular gear button at the bottom center of the Album Dashboard that copies the client's selected album photos from the main pCloud edited folder into a dedicated "ALBUM AND FRAME - WEDDING TALES NEPAL" pCloud folder structure for print production.

## How it works

### Button behavior
- **Disabled** until workflow status reaches step 4 ("Sent for Design")
- When clicked, shows a confirmation dialog with two questions:
  - "Are names matching?" (Yes/No)
  - "Is date okay?" (Yes/No)
- Both must be "Yes" to proceed
- Once confirmed, the gear icon spins while copying is in progress
- After completion, the gear shows a summary: files copied count, any mismatches

### Copy logic

1. Read `client_album_selections` for this client — grouped by `album_type` (e.g. `bride_album`, `groom_album`)
2. For each selection, the `photo_key` is the E2/Xito path like `FALGUN EVENTS 2082/CLIENT NAME/Photos/EVENT/PHOTOGRAPHER/filename.jpg`
3. The same filename exists in pCloud at `WEDDING TALES NEPAL/FALGUN EVENTS 2082/CLIENT NAME/Photos/EVENT/PHOTOGRAPHER/filename.jpg`
4. Determine the "first month" folder using `getMajorityYearMonth` from assignments
5. Build target structure:
   ```
   ALBUM AND FRAME - WEDDING TALES NEPAL/
     FALGUN EVENTS 2082/
       CLIENT NAME/
         BRIDE ALBUM/
           140 photos here
         GROOM ALBUM/
           140 photos here
         FRAME/
           (if deliverables has frame enabled)
   ```
6. Use pCloud's `/copyfile` API to copy each file from source to destination (server-side, no download/re-upload needed)
7. Check `client_deliverables` for frame deliverable — if enabled, create the FRAME folder

### Post-copy summary
- Gear stops spinning, shows info in center: "280 copied" or "Mismatch: 3 missing"
- Compares expected count (from selections) vs actual files in destination folders

## Technical changes

### 1. Edge function: Add `copyfile` action to `supabase/functions/pcloud-api/index.ts`
- New case `'copyfile'`: calls pCloud `/copyfile?auth=...&fileid=X&tofolderid=Y` 
- New case `'copyfilebypath'`: calls pCloud `/copyfile?auth=...&path=X&topath=Y`

### 2. Client API: Add copy helper to `src/lib/pcloud-api.ts`
- `copyPCloudFile(fromPath: string, toPath: string)` — calls edge function with `copyfilebypath` action

### 3. UI: Update `src/components/client-detail/AlbumSection.tsx`
- Add state: `copyStatus: 'idle' | 'confirming' | 'copying' | 'done' | 'error'`, `copyResult`
- Add confirmation dialog with the two Yes/No questions
- Add circular gear button below the dashboard cards (centered)
- Spinning animation during copy
- Summary display after completion
- Logic to:
  - Group selections by album_type → map to folder names (BRIDE ALBUM, GROOM ALBUM, etc.)
  - Get first month from assignments via `getMajorityYearMonth`
  - Create target folders via `createPCloudFolderByPath`
  - Copy each file via `copyPCloudFile`
  - Check deliverables for frame → create FRAME folder
  - Count results and detect mismatches

### No database changes needed
Uses existing `client_album_selections`, `client_deliverables`, and `freelancer_assignments` data.

