

# Cache Photo Data in Browser for Instant Re-Loads

## Problem
Every time a client navigates away from the Photos tab and comes back, the component remounts and all folder listings + signed URLs are fetched again from scratch. The `listCacheRef` is a React ref that dies on unmount.

## Solution
Move the cache to a **module-level singleton** (outside the component) so it survives unmount/remount cycles within the same browser session. Cache both the folder file lists AND the signed URLs per tab.

## Technical Change

### File: `src/components/client-portal/PortalMyPhotos.tsx`

1. **Add module-level cache** (outside component):
```typescript
const folderCache: Record<string, E2File[]> = {};
const urlCache: Record<string, Record<string, string>> = {};
```

2. **Replace `listCacheRef`** with `folderCache` — no more `useRef`

3. **Cache signed URLs**: After fetching URLs via `getE2FileUrls`, store them in `urlCache[tab.id]`. On re-visit, load instantly from cache.

4. **Update the tab-change effect**:
   - If `folderCache[tab.id]` AND `urlCache[tab.id]` exist → set both instantly, skip loading state entirely
   - If only `folderCache[tab.id]` exists → set photos instantly, fetch URLs
   - Otherwise → fetch folder listing + URLs as before

This gives **0ms re-load** when returning to a previously visited tab, with no extra dependencies or storage APIs needed. The cache naturally clears when the browser tab is refreshed.

### File: `src/components/client-detail/AlbumSection.tsx`
Apply the same module-level URL cache pattern so the admin-side Album section also benefits from instant re-loads.

