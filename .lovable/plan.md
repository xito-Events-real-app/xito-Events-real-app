

## Editor View Enhancements: Status Changes + Next Up Selector

### What Changes

**1. Add "Move to" dropdown on each card inside EditorView**

Currently, editor cards only show client name, event, edit type, and urgency badge. We will add a "Move to" dropdown on each card (right side) that allows changing the stage of that row to any other stage, same as in the Classic/Pipeline views.

**2. Redesign "Next Up" stat card with a "Set Next Edit" button**

The "Next Up" stat card currently just shows the highest-urgency row from EDIT_LAB/QUEUE. We will:
- Add a "Set Next Edit" button beside the Next Up card
- Clicking it opens a popover/dialog listing all rows assigned to this editor from these categories (in this priority order):
  1. **EDIT LAB** (first recommendation)
  2. **RE-EDIT ON PROGRESS**
  3. **COLOR QUEUE**
  4. **QUEUE** (last)
- Each item shows: stage badge + client name + event + edit type + urgency
- Clicking an item sets it as the "next up" by giving it the highest urgency in that editor's queue (or we visually highlight it)

### Technical Details

**File: `src/components/video-edit/DesktopVideoEditTracker.tsx`**

**EditorView component changes:**

1. **Props**: Add `onPushToStatus`, `onUpdateField`, `editors` (for editor dropdown), `onUpdateDeadline`, `onSplit`, `onMerge`, `togglePlaying` to `EditorView` so cards can trigger status changes.

2. **Card enhancement** (lines ~1201-1214): Add a `Select` dropdown for "Move to" on each card row, listing all stages. On change, call `onPushToStatus(row.id, newStatus, row.mergedIds)`.

3. **Next Up section** (lines ~1128-1133):
   - Add state `nextUpPickerOpen` 
   - Show a "Set Next Edit" button next to the Next Up card
   - When clicked, render a popover listing editor's rows from EDIT_LAB, RE_EDIT_ON_PROGRESS, COLOR_QUEUE, QUEUE (in that order)
   - Each item is clickable; selecting it sets that row's urgency to "5" (highest) to make it the actual "next up"

4. **Parent component** (line ~1582): Pass `updateField`, `pushToStatus`, `editors`, `updateDeadline`, `splitRow`, `mergeRow`, `togglePlaying` to `EditorView`.

### Implementation Scope
- ~80 lines of new JSX/logic in `EditorView`
- ~5 lines updating the parent to pass props
- Single file change: `DesktopVideoEditTracker.tsx`

