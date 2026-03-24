

## Client Detail View in Video Edit Tracker

### Problem
When clicking a client name, the current pipeline stats bar only shows numbers per stage. User wants to see the actual row details for each stage the client has items in, all on the same page — no tab switching needed.

### Solution
When a client filter is active, replace the tab-based view with a **single-page stacked layout** showing:

1. **Summary bar** with grouped counts:
   - **Untouched** = QUEUE count
   - **On Progress** = Edit Lab + Edit on Progress + Color Queue + Color Lab + Color on Progress + Export Queue + Exported + Client Review + Re-Edit on Progress
   - **Finalized** = FINALIZED count
   - Format: `Total: 5 · Untouched: 3 · On Progress: 1 · Finalized: 1`

2. **Stacked sections** — for each stage that has rows for this client, render a section header (stage name + count) followed by the full table with row details. Only stages with rows are shown.

### Changes to `src/components/video-edit/DesktopVideoEditTracker.tsx`

1. **Summary bar** (lines 427-436): Replace the per-stage pipeline stats with the 3-category grouping (Untouched / On Progress / Finalized) plus total.

2. **Client detail view** (lines 439-468): When `filterClient` is active, instead of rendering `TabsContent` per stage, render a scrollable list of sections — each section has a stage header and the `VideoEditTable` for that stage's filtered rows. Skip stages with 0 rows. Keep the tabs visible but switch to this stacked view below.

3. **Auto-switch to "All" tab** when client is clicked so the stacked view is visible.

### Changes to `src/components/video-edit/MobileVideoEditTracker.tsx`
Same stacked layout when client filter is active.

### Files changed
1. `src/components/video-edit/DesktopVideoEditTracker.tsx`
2. `src/components/video-edit/MobileVideoEditTracker.tsx`

