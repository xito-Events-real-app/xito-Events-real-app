

## WTN Pipeline — Snake-Style Visual Pipeline View

### Concept
A green circular button in the Video Edit Tracker header opens a full-screen overlay showing video edit rows as a **snake/S-curve pipeline** instead of table rows. Each row becomes a **card/box** flowing left-to-right, wrapping in alternating directions (like a snake), creating the visual style shown in the reference images. Cards are **drag-and-drop reorderable** to set custom priority order. Each card shows client info, edit type, urgency, and has an editor selector.

### Layout
```text
Header: [Pipeline tabs] [Filter bar same as main tracker] [X close]

Snake flow (scrollable):
┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐
│Card 1│───│Card 2│───│Card 3│───│Card 4│
└──────┘   └──────┘   └──────┘   └──────┘
                                     │
┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐
│Card 8│───│Card 7│───│Card 6│───│Card 5│
└──────┘   └──────┘   └──────┘   └──────┘
   │
┌──────┐   ┌──────┐   ...
│Card 9│───│Card10│───
└──────┘   └──────┘
```

Each card: client name, sub-event, edit type, event date, urgency badge, editor dropdown, "Move to" stage dropdown. Connected by colored pipe/connector lines between cards.

### Files

**1. New: `src/components/video-edit/WtnPipelineView.tsx`**
- Full-screen overlay component
- Reuses `useVideoEditTracker()` hook for data, filters, and actions
- Same filter bar (client, edit type, year/month, urgency/priority sort) and pipeline tabs as main tracker
- Snake grid layout: 4 cards per row, alternating direction (odd rows L→R, even rows R→L)
- SVG/CSS connectors between cards (horizontal lines + vertical turns at row ends)
- Each card is a styled box with: priority number, client name, edit type, event date, urgency badge, editor `<Select>`, "Move to" `<DropdownMenu>`
- Drag-and-drop reordering using HTML5 drag events (`onDragStart`, `onDragOver`, `onDrop`) — purely local state reorder, no DB change (visual priority only within this view)
- New cards from data changes append at the bottom automatically
- Loads editors from `freelancers_cache` (same pattern as main tracker)

**2. Edit: `src/components/video-edit/DesktopVideoEditTracker.tsx`**
- Add a green circular button in the header (top-right): `<Button className="rounded-full bg-green-600 hover:bg-green-500 w-10 h-10">` with a pipeline/workflow icon
- State: `showPipeline: boolean`
- When true, render `<WtnPipelineView onClose={() => setShowPipeline(false)} />`

**3. Edit: `src/components/video-edit/MobileVideoEditTracker.tsx`**
- Same green button in mobile header, opens `WtnPipelineView` (responsive: 2 cards per row on mobile)

### Snake rendering approach
- CSS Grid with 4 columns
- Track row index: even rows render cards in normal order, odd rows in reverse order
- After each row of 4, render a vertical connector on the appropriate side (right for even→odd, left for odd→even)
- Connector styling: colored rounded divs/SVG paths matching the stage color

### Drag-and-drop
- Local `orderedIds` state initialized from priority-sorted row IDs
- `onDragStart` stores dragged card ID
- `onDragOver` with `preventDefault` + visual drop indicator
- `onDrop` reorders `orderedIds` array, re-renders snake in new order
- No DB persistence of custom order (session-only)

### Card design
- ~200px wide, rounded corners, subtle shadow, stage-colored left border
- Compact layout: priority badge top-left, client name bold, edit type + date below, urgency dot, editor select, move-to dropdown

