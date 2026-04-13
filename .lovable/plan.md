

# Album Section: Dashboard + Toggle View

## What changes

Split the Album section into two views controlled by a toggle:

1. **Dashboard view (default)** — Shows on load, no photos fetched automatically
2. **Album Photos view** — Shows photo gallery tabs (existing behavior), only loads when toggled

## UI improvements

### Dashboard view (larger, better layout)
- **Album Overview header** — stays at top, larger text
- **3-card grid** — each card gets more vertical space, larger fonts/numbers:
  - **Photos for Album (Xito Drive)**: Large count, per-tab breakdown, **Refresh button** to re-fetch E2 counts (clears cache and reloads)
  - **Original Edited (pCloud)**: Large count + total size, per-tab breakdown with sizes, "Load All Counts" button
  - **Selection Progress**: Bigger progress bars, album names more prominent
- **Match Indicator** — shown below cards when all counts loaded, same as current but with slightly larger text
- **Toggle button** at bottom: "View Album Photos →" to switch to gallery view

### Album Photos view
- A "← Back to Dashboard" button at top
- Existing tabs + photo grid (unchanged logic)
- Photos only load when this view is active

### Refresh button for Xito Drive
- Clears `albumFolderCache` entries and `tabPhotoCounts` state
- Re-fetches E2 folder listing for all tabs
- Shows loading spinner during refresh

## Technical details

### Modified: `src/components/client-detail/AlbumSection.tsx`
- Add `viewMode` state: `'dashboard' | 'photos'` (default: `'dashboard'`)
- Move photo-loading `useEffect` to only run when `viewMode === 'photos'`
- Add `refreshXitoCounts` callback that clears caches and re-lists all tabs
- Restructure render: conditionally show dashboard cards OR photo gallery based on `viewMode`
- Increase card padding, font sizes, and spacing for dashboard view

### No new files or database changes needed

