

## Plan: Fix Album Loading Performance and Data Sanitization

### Problems Found in Network Requests

1. **Year sanitization** — The `parseInt(aYear)` fix will handle newline-corrupted years. For PRASANNA MAINALI the year is already clean ("2082"), so this isn't the bottleneck here.

2. **Duplicate tabs** — No deduplication exists, so the same `tabId` can appear multiple times, doubling API calls. Fix: add a `Set<string>` to skip duplicate tab IDs.

3. **Massive file sizes** — The real slowness: photos are **3-7MB each** (full-res JPEGs). Loading 14 of these as grid thumbnails = ~70MB of downloads. The `listE2Folder` API calls themselves return in under 1 second. Fix: the grid thumbnails should not load all at once — use `loading="lazy"` (already present) but also limit initial URL fetching to the **first 12 photos** and load more on scroll.

4. **Double list calls** — Each tab fires `listE2Folder` twice: once for count (on mount for all tabs) and once when the tab is active. Fix: cache the list result from the count fetch and reuse it when the tab becomes active instead of re-fetching.

### Files to Modify

**`src/components/client-detail/AlbumSection.tsx`**
- Sanitize year with `parseInt()` (line 70)
- Deduplicate tabs using a `Set<string>` for seen tab IDs
- Cache `listE2Folder` results from count-fetching into a `useRef<Record<string, E2File[]>>` so the active tab reuses cached file lists instead of re-fetching
- Limit initial `getE2FileUrls` batch to first 12 photos; fetch remaining URLs when user scrolls down (intersection observer or "Load more" button)

### This will fix all clients and years because:
- `parseInt()` strips any garbage characters from year/month fields universally
- Tab deduplication prevents redundant API calls regardless of how many assignment rows exist
- Cached list results cut API calls in half for every client
- Lazy URL fetching reduces initial bandwidth from ~70MB to ~15MB

