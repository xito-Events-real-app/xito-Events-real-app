

## Fix WTN Pipeline: Larger Cards, Status Info, Colors, Better Drag, Urgency Sort, Auto-append on Move, Pipeline Column in Main Table

### Changes

**1. `src/components/video-edit/WtnPipelineView.tsx` — Major card and drag improvements**

- **Larger cards**: Change from `w-[200px]` to `w-[280px]` with more padding and spacing
- **Status badge on each card**: Show the current stage label (e.g. "Queue", "Edit on Progress") as a colored badge using stage-specific background colors
- **Colorful cards**: Each card gets a subtle stage-colored background gradient (not just a left border) — e.g. light blue bg for Edit Lab, light purple for Color stages, light green for Finalized
- **Better drag-and-drop**: Replace raw HTML5 drag with pointer-event-based approach using `onPointerDown`/`onPointerMove`/`onPointerUp` with visual feedback: dragged card gets elevated shadow + opacity, drop zone shows a bright insertion line between cards (not just ring on target card). Use `React.useRef` for drag state to avoid stutter.
- **Default sort by urgency**: Initialize `sortMode` to `'urgency'` instead of `'default'` so pipeline opens sorted by urgency (highest first)
- **Auto-append moved items**: When a card is moved to another stage via "Move to", it should appear at the end of that stage's ordered list. Already handled by `SnakeGrid`'s `useEffect` syncing new IDs to end.

Stage color map for card backgrounds:
```
QUEUE: bg-gray-50/80, EDIT_LAB: bg-blue-50/80, EDIT_ON_PROGRESS: bg-blue-100/60,
COLOR_QUEUE: bg-purple-50/80, COLOR_LAB: bg-purple-100/60, etc.
FINALIZED: bg-green-50/80
```

**2. `src/components/video-edit/DesktopVideoEditTracker.tsx` — Add "Pipeline" column to main table**

- Add a new `<TableHead>Pipeline</TableHead>` column after "S.No" (or after Priority)
- For each row, compute its position within its current stage's pipeline ordering (1-based index within that stage's rows sorted by urgency desc, matching the pipeline view order)
- Display as a small numbered badge: `P1`, `P2`, `P3` etc.

**3. `src/components/video-edit/MobileVideoEditTracker.tsx` — Same pipeline number in mobile cards**

- Show the pipeline position number in the mobile card header

### Card design (updated)
```text
┌─────────────────────────────────┐
│ #1  ⚡5        ┌──────────────┐ │
│               │ Edit on Prog │ │  ← colored stage badge
│               └──────────────┘ │
│ SHAKTI NEUPANE                 │
│ Bride Mehndi                   │
│ Full Video + Highlights        │
│ 2026-03-15                     │
│ [Urgency ▾] [Editor ▾]        │
│ [Move to... ▾]                 │
└─────────────────────────────────┘
```

### Files changed
1. `src/components/video-edit/WtnPipelineView.tsx` — larger cards, status badge, colors, improved drag, urgency default sort
2. `src/components/video-edit/DesktopVideoEditTracker.tsx` — add Pipeline column to table
3. `src/components/video-edit/MobileVideoEditTracker.tsx` — add pipeline number to mobile cards

