

# Album Dashboard — Photo Status Overview

## What gets built
A dashboard card section at the top of the Album section (before the photo gallery tabs) showing three status cards:

1. **Photos for Album (Xito Drive / E2)** — Low-quality photos uploaded for client selection. Count per event/photographer tab.
2. **Original Edited Photos (pCloud)** — High-quality edited photos. Count and total size per event/photographer folder from `WEDDING TALES NEPAL/{monthFolder}/{clientName}/Photos/{event}/{photographer}/`.
3. **Album Selection Progress** — Per-album selection counts vs 140 max, with progress bars.

Plus a **match indicator** showing whether Xito Drive count matches pCloud count per tab (green check if matching, red warning if not).

## Technical Details

### Modified: `src/components/client-detail/AlbumSection.tsx`

**New data loading:**
- Import `listPCloudFolderByPath`, `isPCloudImage`, `formatPCloudSize` from `pcloud-api`
- Import `getAlbumSelections`, `getAlbumDefsFromDeliverables` from `album-selection-api`
- For each tab, build the pCloud path: `WEDDING TALES NEPAL/{monthFolder}/{clientName}/Photos/{event}/{photographer}/`
- List pCloud folder contents, count images, sum file sizes
- Cache pCloud results in a module-level cache (like existing `albumFolderCache`)
- Fetch album defs and selections on mount

**New state:**
- `pcloudCounts: Record<tabId, { count: number; totalSize: number }>` — per-tab pCloud photo count and total size
- `albumDefs: AlbumDef[]` — configured albums
- `albumSelections: AlbumSelection[]` — current selections
- `pcloudLoading: boolean`

**Dashboard cards (3-column grid above tabs):**

| Card | Content |
|------|---------|
| Photos for Album (Xito Drive) | Per-tab count breakdown, total count |
| Original Edited Photos (pCloud) | Per-tab count + size breakdown, total count + total size |
| Album Selection | Per-album progress bar (e.g. "Bride Album: 87/140"), uses `Progress` component |

**Match indicator per tab:**
- Compare E2 count vs pCloud count
- Show green "Match" badge or red "Mismatch: E2 has X, pCloud has Y" warning
- Also show total match status in a summary row

**Loading strategy:**
- pCloud counts load lazily per tab (same pattern as E2) to avoid hammering the API
- A "Load All Counts" button fetches all tabs at once for the full comparison view

### No new files needed
All changes in `AlbumSection.tsx` using existing APIs.

### No database changes needed
Uses existing `client_album_selections` and `client_deliverables` tables plus E2/pCloud APIs.

