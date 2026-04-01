

# Cross-Drive Synchronicity Check (XITO ↔ pCloud)

## What It Does

Adds a "Check Sync" button in the XITO Drive toolbar that appears only at **level 3+** (event/freelancer level, e.g. `FALGUN EVENTS 2082 > KARISHMA SHRESTHA > WEDDING(BOTH SIDES) > SAFAL KC`). When clicked, it compares the file count and names between the current XITO Drive (R2) folder and the equivalent pCloud folder, then displays an info bar showing match/mismatch details.

## Path Mapping

XITO Drive path: `FALGUN EVENTS 2082/KARISHMA SHRESTHA/Photos/WEDDING(BOTH SIDES)/SAFAL KC/`
pCloud equivalent: `/WEDDING TALES NEPAL/FALGUN EVENTS 2082/KARISHMA SHRESTHA/Photos/WEDDING(BOTH SIDES)/SAFAL KC`

The pCloud path is simply `/WEDDING TALES NEPAL/` + the XITO S3 prefix (minus trailing slash).

## UI Design

- A **"Check Sync"** button placed in the toolbar row, before the Recalculate button
- Only visible at breadcrumb level ≥ 2 (event level and deeper)
- Default state: just the button, no banner
- After clicking: shows an info bar above the folder info bar with results:
  - **In sync**: Green bar — "✓ Both drives in sync — X files match"
  - **Mismatch**: Amber bar — "⚠ Out of sync" with details:
    - "XITO: X files · pCloud: Y files"
    - "Z files only in XITO · W files only in pCloud" (based on filename comparison)

## Implementation

### File: `src/components/xito-drive/XitoDriveBrowser.tsx`

1. Add new state variables:
   - `crossSyncResult` — stores comparison result (null by default)
   - `crossSyncChecking` — loading state

2. Add `handleCheckCrossSync` function:
   - Get current E2 files (already loaded in `e2Files`)
   - Call `listPCloudFolderByPath("/WEDDING TALES NEPAL/" + currentS3Prefix)` to get pCloud contents
   - Compare file names (strip path, compare by name only)
   - Compute: files only in XITO, files only in pCloud, matching count

3. Add button in toolbar (next to Recalculate), visible when `currentLevel >= 2`:
   ```
   Check Sync (default) → Checking... (loading) → button resets after result shows
   ```

4. Add result info bar between the toolbar and the folder info bar:
   - Green banner if `onlyInXito.length === 0 && onlyInPCloud.length === 0`
   - Amber banner with mismatch details otherwise
   - Dismissible (X button to clear result)

### No new files needed — single file edit to `XitoDriveBrowser.tsx`

