

## Fix Client File Detail Page — 5 Changes

### Changes to `src/pages/FileClientDetail.tsx`

**1. "Set Path" redirects to FullScreenFilesTable with specific client+event expanded**
- Change the "Set Path →" link to navigate with query params that identify the specific file:
  ```
  /files?section=files&client={clientName}&event={eventName}&year={eventYear}&month={eventMonth}
  ```
- The FullScreenFilesTable already has `filterClient` state — we'll read these from URL params to auto-expand the right row.

**2. Rearrange summary cards: Total Size → Photo Size → Video Size → Remaining (remove "Copied")**
- Card 1: Total Size (blue) — same as now
- Card 2: Photo Size (purple) — `stats.photoSize` 
- Card 3: Video Size (amber) — `stats.videoSize`
- Card 4: Remaining (red) — clickable, toggles a `showOnlyRemaining` filter state

**3. Remaining card is clickable — filters table to show only pending files**
- Add `showOnlyRemaining` state toggle
- When active, filter `eventGroups` to only show files where `!f.final_generated_path`
- Visual indicator on the card when filter is active (ring/border highlight)

**4. Event name gets a colored background highlight**
- Replace the plain text event header with a styled bar:
  ```
  <div className="bg-blue-900/40 border-l-4 border-blue-500 px-4 py-2 rounded-r-lg">
  ```

**5. Path column shows device name pill with hover for full path (same pattern as FullScreenFilesTable BackupPill)**
- Import `HoverCard` components
- If file has `final_generated_path`: show device name (`backup_1_device_name` or first segment of path) as a short highlighted pill
- On hover: show full path, timestamp, and time ago — matching the existing `BackupPill` pattern from FullScreenFilesTable

### Changes to `src/components/files/FullScreenFilesTable.tsx`

**6. Read URL params to auto-filter and auto-expand on load**
- Import `useSearchParams`
- On mount, read `client` param → set `filterClient`
- Read `event` param → auto-expand matching row in `expandedRows`
- This enables the "Set Path" redirect from client detail to land on the right expanded row

### Files changed
- `src/pages/FileClientDetail.tsx`
- `src/components/files/FullScreenFilesTable.tsx`

