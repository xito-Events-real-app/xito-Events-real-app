

## Plan: Restructure Storage Modules (XITO DRIVE, pCloud, Barun's Research)

### Summary

Split the current XITO DRIVE into three separate modules with distinct storage backends and folder structures:

```text
1. XITO DRIVE (iDrive E2) — Photos only
   wedding-tales-nepal / YYYY-MM / Client / Photos / Event / Photographer
                                                   / Selected

2. pCloud (new module, browses pCloud) — Photos + Videos
   wedding-tales-nepal / YYYY-MM / Client / Photos / Event / Photographer
                                                   / Selected
                                          / Videos / Highlights
                                                   / Reels
                                                   / Full Videos

3. Barun's Research (new module, browses pCloud) — Client admin folders
   CLIENT DETAILS / YYYY-MM / Client / Quotation
                                     / Payments
                                     / Project Managers / Event
                                     / Lightroom Catalog / Event / Photographer
```

### Files to Modify

**1. `src/lib/xito-drive-utils.ts`** — Split category definitions
- Add separate category arrays: `XITO_CATEGORIES` (Photos only), `PCLOUD_CATEGORIES` (Photos + Videos), `RESEARCH_CATEGORIES` (Quotation, Payments, Project Managers, Lightroom Catalog)
- Update `buildFullFolderTree` to accept a `mode` parameter for generating the right tree per module
- Add `buildResearchFolderTree` for the `CLIENT DETAILS` pCloud root

**2. `src/components/xito-drive/XitoDriveBrowser.tsx`** — Photos only
- Remove Videos, Quotation, Payments, Project Managers, Lightroom Catalog rendering
- At Level 2 (categories), skip straight to Photos content (events + Selected)
- Remove the "Sync to pCloud" button (no longer relevant here)
- Remove dual-write to pCloud on folder creation

**3. `src/lib/pcloud-sync.ts`** — Update sync logic
- Update to create two separate trees: `wedding-tales-nepal` (Photos + Videos) and `CLIENT DETAILS` (admin folders)

**4. New: `src/components/pcloud-drive/PCloudDriveBrowser.tsx`** — pCloud Photos+Videos browser
- Similar virtual folder structure as XITO DRIVE but browsing pCloud via `listPCloudFolderByPath`
- Shows Month > Client > Photos/Videos hierarchy
- Uses pCloud API for thumbnails and file preview (already working)

**5. New: `src/pages/PCloudDrive.tsx`** — pCloud module page
- Same layout pattern as XitoDrive.tsx with pCloud branding (sky/blue gradient, Cloud icon)

**6. New: `src/components/research/ResearchBrowser.tsx`** — Barun's Research browser
- Browses pCloud under `CLIENT DETAILS` root
- Shows Month > Client > Quotation/Payments/Project Managers/Lightroom Catalog
- Creates `CLIENT DETAILS` folder in pCloud if it doesn't exist

**7. New: `src/pages/BarunsResearch.tsx`** — Barun's Research module page

**8. `src/lib/suite-modules.ts`** — Add two new modules
- "pCloud" module with cloud icon, path `/pcloud-drive`, gradient from-sky-500
- "Barun's Research" module with search/book icon, path `/baruns-research`
- Update XITO DRIVE description to "Compressed photos for album (iDrive)"

**9. `src/App.tsx`** — Add routes
- `/pcloud-drive` → PCloudDrive
- `/baruns-research` → BarunsResearch

### Technical Details

- **pCloud browsing**: Uses existing `listPCloudFolderByPath('/wedding-tales-nepal/...')` — no new API needed
- **CLIENT DETAILS folder creation**: On first sync or first visit, call `createPCloudFolderByPath('/CLIENT DETAILS')` 
- **XITO DRIVE simplification**: Since it's Photos-only, Level 2 (categories) is eliminated — goes directly from Client → Events+Selected
- **iDrive E2 folder tree**: Updated `buildFullFolderTree` will only generate Photos paths for iDrive
- **pCloud folder tree**: Separate function generates Photos+Videos paths under `wedding-tales-nepal` and admin paths under `CLIENT DETAILS`
- The `PRE+RECEPTION` issue visible in network requests (+ encoding) will be fixed by using `encodeURIComponent` properly

