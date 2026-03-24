

## Fix WTN Pipeline: Drag-and-Drop, Larger Text, Right-Side Event Filter, Stable Pipeline Numbers

### Problems
1. **Drag-and-drop broken**: The `handlePointerUp` closure captures a stale `dropTargetIdx` because it reads React state inside a closure set during `onPointerDown`. The drop index is always `null` when the pointer lifts.
2. **Card text too small**: Client name is `text-sm`, sub-event/edit-type are `text-xs`.
3. **No event filter**: User wants a right-side rail listing all events (shown event name = subEventName or eventName) that acts as a clickable filter without changing pipeline order numbers.
4. **Pipeline order numbers must never change**: They are computed from the unfiltered urgency-sorted list per stage. Filters only hide cards visually; numbers stay fixed.

### Changes

**1. `src/components/video-edit/WtnPipelineView.tsx` — Fix drag-and-drop + UI + event filter**

**Drag fix**: The core bug is that `handlePointerUp` captures `dropTargetIdx` from the closure scope at mount time. Fix by using a `useRef` for `dropTargetIdx` instead of `useState`, so the pointerup handler always reads the latest value. Keep a state mirror for rendering the drop indicator.

```text
const dropTargetRef = useRef<number | null>(null);
const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

// In pointermove handler:
dropTargetRef.current = closest;
setDropTargetIdx(closest);

// In pointerup handler:
const targetIdx = dropTargetRef.current;  // always fresh
```

**Larger text on cards**:
- Client name: `text-sm` → `text-base font-bold`
- Sub-event: `text-xs` → `text-sm`
- Edit type badge: `text-xs` → `text-sm`
- Event date: `text-xs` → `text-sm`
- Urgency/editor selects: `h-7 text-xs` → `h-8 text-sm`
- Card width: `w-[280px]` → `w-[320px]`

**Right-side event filter rail**:
- Change the main layout from single column to a flex row: `<div className="flex gap-4">` with the snake grid taking `flex-1` and a right sidebar `w-[220px]`
- The sidebar lists all unique event names (using `subEventName || eventName` from the current stage's unfiltered rows) as clickable items
- Clicking an event name sets a new `filterEvent` state that filters the visible cards (but does NOT change pipeline order numbers)
- Active filter shown as highlighted item; click again to clear
- Pipeline order numbers are computed from the full unfiltered urgency-sorted list BEFORE any filtering, stored in a `pipelinePosMap`, and attached to each card. Filtering only hides cards; visible cards keep their original position numbers.

**Pipeline number stability rule**:
- Compute `pipelinePosMap` from `rowsByStatus` (unfiltered, urgency-sorted) per stage
- Attach `_pipelinePos` to each card before filtering
- Display `#N` on each card using `_pipelinePos` instead of the loop index
- When a card moves to another stage via "Move to", it gets appended to the end of the new stage's ordered list (already handled)

**2. Layout structure in WtnPipelineView**

```text
┌──────────────────────────────────────────────────────┬──────────┐
│                Snake Pipeline (flex-1, scrollable)    │ Events   │
│  Card #1 ── Card #2 ── Card #3 ── Card #4           │          │
│                                          │           │ Event A  │
│  Card #8 ── Card #7 ── Card #6 ── Card #5           │ Event B ◀│
│  │                                                   │ Event C  │
│  Card #9 ── ...                                      │ ...      │
└──────────────────────────────────────────────────────┴──────────┘
```

On mobile (< 768px), the event filter rail moves to a horizontal scrollable strip above the snake grid.

### Files changed
1. `src/components/video-edit/WtnPipelineView.tsx` — drag fix (useRef for dropTarget), larger card text, right-side event filter rail, stable pipeline numbers

