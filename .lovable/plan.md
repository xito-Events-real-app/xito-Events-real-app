

# Move "Selected" Folder Tabs to First Position + Fix Mobile Chrome Error

## Changes

### 1. Move Selected tabs to the beginning (PortalMyPhotos.tsx)
In the `tabs` useMemo (lines 199-248), move the "Selected" folder entries to be inserted at the **start** of the `result` array instead of pushed at the end. The rule is: whichever folder gets files first should appear first, and Selected always qualifies.

**How**: After building the `monthYearEntries`, create the Selected tabs first, then spread the photographer tabs after them. Or use `unshift` / prepend logic.

### 2. Move Selected tabs to the beginning (AlbumSection.tsx)
Same change in the `tabs` useMemo (lines 211-265). Selected entries should be prepended, not appended.

### 3. Fix Chrome mobile crash
The probe logic on mount (PortalMyPhotos.tsx lines 250-268) fires `listE2Folder` for **all tabs in parallel**. On mobile Chrome with many tabs, this can exhaust memory or trigger the "can't open this page" error.

**Fix**: Add error handling around the parallel probe and limit concurrency. Use a simple sequential probe or batch of 3 at a time instead of `Promise.all` on all tabs. Also add a `try/catch` around each individual probe to prevent one failure from crashing the whole page.

## Files to edit
1. `src/components/client-portal/PortalMyPhotos.tsx` — prepend Selected tabs + fix mobile probe concurrency
2. `src/components/client-detail/AlbumSection.tsx` — prepend Selected tabs

