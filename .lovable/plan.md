

# Fix: Photos Not Showing for Some Clients + Speed Improvement

## Root Cause — Wrong Month Folder

Both `PortalMyPhotos` and `AlbumSection` compute a single "majority month" across all assignments, then use it as the S3 folder prefix for EVERY tab. This breaks when:
- A client's E2 folder was created under a different month than the majority
- Example: KARISHMA SHRESTHA has events in month 11 (MAGH) and 12 (FALGUN), majority picks MAGH, but all photos are in `FALGUN EVENTS 2082/KARISHMA SHRESTHA/`

The fix: use each assignment's own `eventMonth`/`eventYear` to build the S3 prefix per tab, instead of a global majority month.

## Root Cause — Slow Loading

XITO Drive fetches ALL signed URLs in one batch call. Album/Portal fetch only 12 at a time requiring manual "Load more" clicks. Fix: fetch all URLs in a single batch like XITO Drive does.

## Plan

### 1. Fix per-tab S3 prefix in `PortalMyPhotos.tsx`
- Remove the `majorityYearMonth` calculation
- In the `tabs` builder, use each assignment's own `eventMonth` and `eventYear` to compute the month folder label (e.g., `FALGUN EVENTS 2082`)
- Each tab gets its own correct prefix based on its assignment's month

### 2. Fix per-tab S3 prefix in `AlbumSection.tsx`
- Same change: remove global `majorityYearMonth`, use per-assignment month/year for each tab's prefix

### 3. Speed up URL loading in both components
- Replace the initial-batch-of-12 + "Load more" pattern with a single batch fetch of ALL URLs (like XITO Drive does)
- Remove `urlsFetchedCount`, `loadMoreUrls`, and the "Load more" button
- Fetch all URLs at once after listing the folder

### Files Changed
1. `src/components/client-portal/PortalMyPhotos.tsx` — per-tab prefix + batch URL loading
2. `src/components/client-detail/AlbumSection.tsx` — per-tab prefix + batch URL loading

