

## Plan: Add "Album" Section to Client Detail Page

### What It Does
A new **Album** sidebar section below "Edit" that:
1. Shows an album summary header derived from deliverables data (e.g., "Total Albums: 1 • Bride Side Album • Type: Karizma")
2. Below that, event tabs with photographer sub-tabs (e.g., "Christian Wedding (Nikit)" | "Christian Wedding (Safal)")
3. Each tab loads photos from iDrive E2 using the XITO DRIVE path: `{year}-{month}/{clientName}/Photos/{eventName}/{photographerName}/`
4. Premium "XITO IMAGE VIEWER" full-screen gallery with preloading, swipe, keyboard nav, and counter

### Technical Details

**1. Add `album` to SectionType and sidebar**
- File: `src/components/client-detail/ClientDetailSidebar.tsx`
- Add `'album'` to `SectionType` union
- Add sidebar item `{ id: 'album', label: 'Album', icon: BookOpen }` after `edit`

**2. Add mobile tab for Album**
- File: `src/pages/ClientDetail.tsx`
- Add `{ id: 'album', label: 'Album' }` to mobile section tabs array
- Add rendering block: `{activeSection === 'album' && <AlbumSection ... />}`
- Pass: `registeredDateTimeAD`, `clientName`, `events` (parsed), `freelancerAssignments`

**3. Create `src/components/client-detail/AlbumSection.tsx`** (new file ~400 lines)

**Album Summary Header:**
- Load deliverables from `loadDeliverables(registeredDateTimeAD)` 
- Filter for `section === 'album'` and `enabled === true` (bride_album, groom_album, other_album)
- Display: total count, which sides are enabled, album type names

**Event + Photographer Tabs:**
- For each event, get photographers from `freelancerAssignments` (PB, PG, EP fields)
- Render tabs: `{eventName} ({photographerName})` for each photographer per event
- When a tab is selected, build S3 prefix: `{year}-{month}/{clientName}/Photos/{eventName}/{photographerName}/`
- Call `listE2Folder(prefix)` to get photos
- Call `getE2FileUrls(keys)` for batch signed URLs
- Display photo grid with thumbnails

**4. Create `src/components/client-detail/XitoImageViewer.tsx`** (new file ~300 lines)

Premium full-screen image viewer with:
- **Title**: "XITO IMAGE VIEWER" in a modern serif/display font (using Tailwind's `font-serif` + tracking)
- **Counter**: "12 of 45" at top center
- **Navigation**: Left/right arrows always visible at edges; keyboard ArrowLeft/ArrowRight/Escape
- **Touch swipe**: `touchstart`/`touchend` gesture detection
- **Preloading**: When viewing image N, preload N-1 and N+1 signed URLs into hidden `<img>` tags
- **Smooth transitions**: CSS transition on opacity for image swaps (no layout shift)
- **End-of-folder message**: When reaching the last photo, show "You've viewed all X photos from this folder"
- **Download button**: Single-click download for current image

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/client-detail/ClientDetailSidebar.tsx` | Add `'album'` to type + sidebar items |
| `src/components/client-detail/AlbumSection.tsx` | **Create** — album summary + event/photographer tabs + photo grid |
| `src/components/client-detail/XitoImageViewer.tsx` | **Create** — premium full-screen viewer with preloading |
| `src/pages/ClientDetail.tsx` | Add album section rendering + mobile tab |
| `src/components/client-detail/index.ts` | Export new components |

