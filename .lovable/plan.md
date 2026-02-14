

# Highlight Unassigned Required Roles + Fix Assignment Counter

## Problem
1. Empty cells for **required** roles (e.g., VB is required but not yet assigned) have no visual urgency -- they look the same as optional empty slots.
2. The header shows `108/400 assigned` but `400` counts ALL cells (including "Not Required" ones). The denominator should only count **required** cells.

## Solution

### 1. Red Flashing Highlight on Unassigned Required Cells

**Desktop**: The empty `+` button in `CrewCell` will get a red-tinted background with a subtle CSS pulse animation when the role is required but unassigned.

**Mobile**: Same treatment on the mobile card layout -- empty required slots get a red border/background pulse.

CSS animation to add in `src/index.css`:
```css
@keyframes pulse-red {
  0%, 100% { background-color: rgba(239, 68, 68, 0.08); }
  50% { background-color: rgba(239, 68, 68, 0.2); }
}
.animate-pulse-red { animation: pulse-red 2s ease-in-out infinite; }
```

### 2. Fix Header Stats to Show Only Required Counts

Replace `totalCells` (which is `filteredRows * 10`) with a computed `requiredCells` that only counts cells where the role is actually required (based on `requiredCategories`).

Add a new stat showing **remaining unassigned required roles**:
- `X remaining` in a red/amber badge next to the assigned count
- Formula: `requiredCells - assignedCount`

### Files to Modify

**`src/index.css`** -- Add the `pulse-red` keyframe animation

**`src/components/suite/AllClientsCrewTable.tsx`**:
- Compute `requiredCells` instead of using `totalCells` for the denominator
- Add `remainingCount = requiredCells - assignedCount` stat in the header (red badge)
- In `CrewCell`: when `isRequired && !hasValue`, apply red border + `animate-pulse-red` class to the empty button
- In mobile layout: same red pulse on empty required slots
- Header stat changes from `108/400 assigned` to `108/285 assigned | 177 remaining` (where 285 is actual required count)

### Visual Result

**Header**: `42 events | 108/285 assigned | 177 remaining`

**Desktop table**: Empty required cells pulse with a soft red glow instead of plain dashed gray border

**Mobile cards**: Empty required role badges pulse red

