

## Video Edit Tracker — Dashboard & Editor View Enhancements

### Summary
Rework the Dashboard to focus on Edit on Progress info, make Pipeline Overview clickable, filter sidebar editors to only active ones, add green dot for editors in progress, show "Available Editors" on dashboard with urgency-based recommendation popup, and add stat cards to each editor's page.

### Changes

**1. Dashboard View (`DashboardView`) — Simplify + Enhance**

- **Remove** Current/Next/Last/Finalized/Re-Edits stat cards row
- **Replace with**: "Edit on Progress" focused section — show all rows in EDIT_ON_PROGRESS as prominent cards (client name, event, edit type, editor, urgency)
- **Pipeline Overview**: Make each stage card **clickable** → sets `activeView = 'pipeline'` and passes the clicked stage key so pipeline opens on that tab. Need to lift `onViewChange` into `DashboardView` props or use a callback like `onStageClick(stageKey)`.
- **New bottom section: "Available Editors"** — Editors who have been assigned tasks before (exist in any row's editor field) but currently have NO rows in EDIT_ON_PROGRESS, RE_EDIT_ON_PROGRESS, or COLOR_ON_PROGRESS. Display as clickable name cards.
- **Clicking an available editor** → Opens a dialog/popup showing top 5 urgent unassigned rows from QUEUE (sorted by urgency desc). Each row has an "Assign" button that sets `editor = selectedEditorName` on that row, effectively sending it to that editor.

**2. Sidebar (`VideoEditSidebar`) — Filter editors**

- Only show editors in the sidebar who have rows in stages QUEUE through RE_EDIT_ON_PROGRESS (not FINALIZED-only editors)
- **Green dot**: Show a green (`bg-green-500`) dot for editors who have at least 1 row in EDIT_ON_PROGRESS, COLOR_ON_PROGRESS, or RE_EDIT_ON_PROGRESS (active work). Others keep the existing teal/zinc dot.

**3. Editor View (`EditorView`) — Add stat cards**

- Add the same 5 stat cards at the top (Current, Next, Last, Finalized total, Re-Edits total) but **scoped to that editor's rows only**:
  - Current: highest urgency row in EDIT_ON_PROGRESS for this editor
  - Next: highest urgency in EDIT_LAB/QUEUE for this editor
  - Last Finalized: most recent finalized for this editor
  - Finalized: total count for this editor
  - Re-Edits: count + names for this editor
- Keep existing grouped stage table below

**4. Pipeline View integration**

- Pass an `initialStage` prop to `WtnPipelineView` when opened from dashboard stage click
- `WtnPipelineView` uses this to set its default active tab

### Files Changed

1. **`src/components/video-edit/DesktopVideoEditTracker.tsx`**
   - `DashboardView`: Remove 5-card stat row. Add Edit on Progress section. Make Pipeline Overview cards clickable (callback prop). Add "Available Editors" section at bottom with recommendation popup dialog.
   - `VideoEditSidebar`: Filter editors to those with rows in QUEUE→RE_EDIT_ON_PROGRESS. Green dot for editors with active progress rows.
   - `EditorView`: Add 5 stat cards (Current/Next/Last/Finalized/Re-Edits) scoped to that editor.
   - Main component: Pass `onStageClick` handler that switches to pipeline view with initial stage. Pass `updateField` to dashboard for assignment.

2. **`src/components/video-edit/WtnPipelineView.tsx`**
   - Add optional `initialStage?: string` prop. Use it as default tab value when provided.

### Available Editors Section Design
```text
──── Available Editors ────
  [Nikit]  [Arjun]  [Barun]
  Click to assign from queue
```

### Recommendation Popup (on click)
```text
┌─────────────────────────────────┐
│ Assign to Nikit                 │
│                                 │
│ Top urgent unassigned videos:   │
│ 🔴 5 - PABINA · Full Video     │  [Assign]
│ 🟠 4 - JIGYASHA · Highlights   │  [Assign]
│ 🟡 3 - RIYA · Reel             │  [Assign]
│                                 │
│ Showing QUEUE items without     │
│ an editor assigned              │
└─────────────────────────────────┘
```

