

## Fix: Wrap CrewCategorySelector in a Popover

### Problem
The `CrewCategorySelector` component is rendered **inline** in each table row's event cell (line 728), showing the full 10-button grid + "Select All/Clear All" directly in the table. This breaks the UI layout.

### Solution
Wrap the `CrewCategorySelector` in a `Popover` (matching the pattern used in `FullScreenEventCard.tsx` and `FreelancerAssignmentSection.tsx`). The trigger will be a small icon button (or `CategoryBadges` showing selected codes). Clicking it opens the selector in a floating popover.

### Changes

**File: `src/components/suite/AllClientsCrewTable.tsx`**

1. Import `CategoryBadges` from `CrewCategorySelector` and `Popover`/`PopoverContent`/`PopoverTrigger` from UI components (if not already imported).

2. Replace the inline `<CrewCategorySelector>` (lines ~727-742) with:
   - A `Popover` wrapping a trigger button (small settings/crew icon or the `CategoryBadges` display)
   - The `CrewCategorySelector` inside `PopoverContent` with proper z-index

3. Apply the same pattern in the mobile card renderer if it also renders the selector inline.

This restores the old compact UI where the event name column stays narrow and the crew category selector only appears on demand.

