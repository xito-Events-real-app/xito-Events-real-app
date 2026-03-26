

## Plan: Fix Album Photo Loading, Viewer UX & UI Improvements

### Issues to Fix

1. **Slow photo loading** — All signed URLs are fetched in one batch, but thumbnails load simultaneously causing congestion. Fix: batch URLs in chunks + use progressive loading.
2. **Preloaded photos visible in background** — The preloading `new Image()` approach is correct but the viewer shows a fade transition that briefly shows the old image behind. Fix: use a hidden preload layer and only swap when the next image is fully loaded, no fade-out gap.
3. **Tab labels missing photographer name** — Currently only shows photographer name when multiple photographers exist. Fix: always show `Event (Photographer)` format.
4. **Remove filename from viewer bottom bar** — User doesn't want the file name shown.
5. **Add total photo count in Album header** — Show total photos across all tabs.
6. **Add per-tab photo count in tab label** — Show count next to each tab.

### Files to Modify

**1. `src/components/client-detail/AlbumSection.tsx`**
- Store per-tab photo counts in state: `tabPhotoCounts: Record<string, number>`
- When photos load for a tab, update that tab's count
- Fetch counts for ALL tabs on mount (parallel `listE2Folder` calls, just for file count)
- Show total across all tabs in Album Overview header: "Total Photos: 245"
- Update tab labels to always include photographer: `{event} ({photographer}) · {count}`
- Always show `{event} ({photographerName})` in tab label regardless of photographer count

**2. `src/components/client-detail/XitoImageViewer.tsx`**
- Remove bottom filename bar entirely (lines 148-151)
- Fix preloading: render prev/next images as hidden `<img>` elements in the DOM (not `new Image()`) so they're truly cached and ready
- Remove the fade-out/fade-in gap: instead of `setFadeIn(false) → setTimeout → setFadeIn(true)`, instantly swap images since adjacent ones are preloaded. Use a crossfade approach where the new image renders on top immediately.

### Technical Approach

**Preloading fix (XitoImageViewer):**
- Render 3 `<img>` tags: previous, current, next — only current is visible (`opacity-100`), prev/next are `opacity-0 absolute` but still in DOM loading
- On navigate: instantly update `currentIndex` — since the image is already loaded in DOM, it appears immediately
- No setTimeout fade needed

**Photo count per tab (AlbumSection):**
- On component mount, fire `listE2Folder` for each tab's prefix in parallel
- Store `{ [tabId]: number }` counts
- Display in tab trigger and in header as sum

