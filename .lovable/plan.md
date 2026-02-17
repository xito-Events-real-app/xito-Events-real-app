

# Add Notes for Unassigned Crew + "Set Required Crew" per Event

## Changes

### 1. Notes Button for Unassigned Freelancer Rows

Currently the `UnassignedFreelancerRow` component has toggles but no Note button. We will add the same `+Note` button that assigned rows have.

- The note will be stored in `freelancer_event_settings` using the placeholder name `__role_PB__` (same key already used for toggles)
- When a freelancer is later assigned to that role, the settings (including the note) already exist in the database and can be transferred or referenced

**Implementation**: Add the `+Note` button at the end of the unassigned row's toggle section, using the same `handleOpenNote(placeholderName, config.shortCode)` call pattern already wired in the props.

### 2. "Set Required Crew" Button per Event Card

Add a "Set Required Crew" button in each event card header (next to the assigned count badge). Clicking it opens a Popover with the existing `CrewCategorySelector` component.

When categories are toggled:
- Call `updateRequiredCrewCategories` API to persist to Google Sheets
- Also update `updateCategoriesInCache` for Supabase cache
- Refetch assignments to reflect the change (roles appear/disappear from unassigned list)

The `CrewCategorySelector` is already built and used in the ALL CLIENTS page and FullScreenEventCard -- we reuse it here.

### 3. Transfer Note on Assignment

When a freelancer is assigned to a previously-unassigned role, if a note exists for `__role_XX__`, it should be carried over to the newly assigned freelancer's settings. This ensures pre-written notes are not lost.

## Technical Details

### File: `src/components/client-detail/FreelancerAssignmentSection.tsx`

**Unassigned row note button** (after the toggles div, line ~670):
```tsx
<button
  onClick={() => handleOpenNote(placeholderName, config.shortCode)}
  className={cn(
    "flex items-center gap-1 text-[10px] px-2 py-1 rounded-md transition-colors",
    hasNote ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
      : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
  )}
>
  <NotebookPen className="w-3 h-3" />
  {hasNote ? "Note" : "+Note"}
</button>
```

**Event header "Set Required Crew" button** (in `EventAssignmentCard`, line ~422-433):
```tsx
import { CrewCategorySelector } from "@/components/shared/CrewCategorySelector";
import { updateRequiredCrewCategories } from "@/lib/freelancer-assignment-api";
import { updateCategoriesInCache } from "@/lib/freelancer-assignment-cache";

// In header, add a Popover with CrewCategorySelector
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline" size="sm">Set Required Crew</Button>
  </PopoverTrigger>
  <PopoverContent>
    <CrewCategorySelector
      selected={requiredCodes}
      onChange={async (codes) => {
        await updateRequiredCrewCategories(registeredDateTimeAD, eventName, eventDateAD, codes.join(','));
        await updateCategoriesInCache(registeredDateTimeAD, eventName, codes.join(','), eventDateAD);
        // trigger refetch
      }}
    />
  </PopoverContent>
</Popover>
```

**Props changes**: `EventAssignmentCard` needs a `refetch` callback prop passed down from the parent to refresh assignments after category changes. The parent `FreelancerAssignmentSection` will pass the `refetch` function from `useFreelancerAssignments`.

### Files Modified

| File | Change |
|---|---|
| `src/components/client-detail/FreelancerAssignmentSection.tsx` | Add note button to unassigned rows, add "Set Required Crew" popover to event header, pass refetch prop |

No database changes needed -- all storage uses existing `freelancer_event_settings` table and existing APIs.
