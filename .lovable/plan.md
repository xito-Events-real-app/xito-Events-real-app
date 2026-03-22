

## Expand Video Edit Tracker: 11-Tab Workflow Pipeline

### Overview
Replace the current 2-tab system (Queue, Lab) with an 11-tab sequential pipeline. Each tab has an action button that pushes the row to the next stage.

### Pipeline Stages (in order)

| # | Tab Name | Status Value | Action Button Label |
|---|----------|-------------|-------------------|
| 1 | Queue | QUEUE | Edit Lab → |
| 2 | Edit Lab | EDIT_LAB | Edit on Progress → |
| 3 | Edit on Progress | EDIT_ON_PROGRESS | Color Queue → |
| 4 | Color Queue | COLOR_QUEUE | Color Lab → |
| 5 | Color Lab | COLOR_LAB | Color on Progress → |
| 6 | Color on Progress | COLOR_ON_PROGRESS | Export Queue → |
| 7 | Export Queue | EXPORT_QUEUE | Exported → |
| 8 | Exported | EXPORTED | Client Review → |
| 9 | Client Review | CLIENT_REVIEW | Re-Edit on Progress → |
| 10 | Re-Edit on Progress | RE_EDIT_ON_PROGRESS | Finalized → |
| 11 | Finalized | FINALIZED | *(no action button)* |

### Technical Details

#### File 1: `src/lib/video-edit-api.ts`
- Rename `pushToLab` → generic `pushToStatus(id, newStatus)` that updates `video_edit_status` to any value
- Keep existing `updateVideoEditField` unchanged

#### File 2: `src/hooks/useVideoEditTracker.ts`
- Define a `STAGES` array with `{ key, label, nextStatus, nextLabel }`
- Replace `queueRows`/`labRows` with a single computed map: `rowsByStatus` — keyed by status string, each filtered + priority-sorted
- Replace `pushToLab` with generic `pushToStatus(id, newStatus)` that optimistically updates the row and calls the API
- Export: `{ rowsByStatus, isLoading, updateField, pushToStatus, refresh, STAGES }`

#### File 3: `src/components/video-edit/DesktopVideoEditTracker.tsx`
- Import `STAGES` from the hook
- Render tabs dynamically from `STAGES` array
- `VideoEditTable` receives `actionLabel` and `nextStatus` props instead of `showPushToLab`
- Action button shows `actionLabel` text (e.g. "Edit on Progress →"), calls `pushToStatus(id, nextStatus)`
- Last tab (Finalized) has no action button
- Header summary shows counts for all stages
- Tab bar will be scrollable horizontally to fit 11 tabs

#### File 4: `src/components/video-edit/MobileVideoEditTracker.tsx`
- Same changes — dynamic tabs from `STAGES`, horizontal scroll on TabsList
- `VideoCard` receives `actionLabel`/`nextStatus` instead of `showPushToLab`
- Action button text matches the next stage name

### Files changed
1. `src/lib/video-edit-api.ts` — rename `pushToLab` → `pushToStatus(id, status)`
2. `src/hooks/useVideoEditTracker.ts` — define STAGES, compute `rowsByStatus`, generic `pushToStatus`
3. `src/components/video-edit/DesktopVideoEditTracker.tsx` — dynamic 11-tab rendering
4. `src/components/video-edit/MobileVideoEditTracker.tsx` — dynamic 11-tab rendering

