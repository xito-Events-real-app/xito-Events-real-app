

# Add "Photos Coming Soon" Message with pCloud Link

When a folder has no photos on XITO (iDrive E2), the client portal currently shows a generic "No photos in this folder yet" message. Since photos are always uploaded to pCloud first, we should guide the client to pCloud for early access.

## Current Behavior
- Empty folder shows: "No photos in this folder yet." with a plain icon

## New Behavior
- Empty folder shows: "Photos will appear here soon! For now, view in pCloud" with a pCloud button
- The pCloud button deep-links to the matching folder path: `/WEDDING TALES NEPAL/{s3Prefix}` (e.g., `MAGH EVENTS 2082/ClientName/Photos/EventName/PhotographerName`)
- On mobile: opens `pcloud://` app scheme (falls back to pCloud web if app not installed)
- On desktop: opens pCloud web link

## Change

**File: `src/components/client-portal/PortalMyPhotos.tsx`**

Replace the empty-state block (lines 313-319) with:
- A friendlier message: "Photos will appear here soon" with subtext "For now, view them in pCloud"
- A pCloud button (cloud icon) that builds the path from the current tab's `s3Prefix` and opens:
  - Mobile: `https://e.pcloud.link/#page=filemanager&folder=/WEDDING TALES NEPAL/{prefix}` (or app scheme)
  - Direct: `https://my.pcloud.com/#page=filemanager&folder=/WEDDING TALES NEPAL/{prefix}`
- Keep the existing rose-gold styling consistent with the portal theme

The `s3Prefix` from the active tab already contains the exact folder structure (`MONTH EVENTS YEAR/ClientName/Photos/Event/Photographer/`), which maps 1:1 to the pCloud path under `WEDDING TALES NEPAL`.

