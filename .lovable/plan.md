

# Auto-select first folder with uploaded photos

## Problem
Currently the Photos tab in the client portal always starts on the first tab (index 0), which may be an empty folder. The user wants the default tab to be the first one that actually has photos uploaded in XITO Drive (E2).

## Approach
On mount, before selecting a tab, probe each tab's E2 folder to find the first non-empty one. Set `activeTabIndex` to that tab.

### Changes in `src/components/client-portal/PortalMyPhotos.tsx`

1. Add a new state `initialTabResolved` (boolean, default `false`) to prevent rendering tabs until the check is done
2. Add a `useEffect` that runs when `tabs` are built:
   - Iterate through tabs sequentially (or in parallel for speed)
   - For each tab, call `listE2Folder(tab.s3Prefix)` and check if it has image files
   - Set `activeTabIndex` to the first tab index that has files
   - If no tabs have files, default to index 0
   - Set `initialTabResolved = true`
   - Cache the folder results in `folderCache` so the subsequent photo-loading effect doesn't re-fetch
3. Show a brief loading spinner while resolving the initial tab
4. The existing photo-loading `useEffect` continues to work as before once the tab is set

This keeps the UX snappy — parallel folder checks complete fast since they're just listing, and the result is cached for instant photo display.

### File changed
- `src/components/client-portal/PortalMyPhotos.tsx`

