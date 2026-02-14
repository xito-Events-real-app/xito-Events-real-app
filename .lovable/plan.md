

# Freelancer Category Selection Per Event (Column AA)

## Overview

Add the ability to mark which freelancer roles are "required" for each event. This is stored in **Column AA (index 26)** of the `BOOKED CLIENTS FREELANCERS` sheet as newline-separated, comma-separated category codes (e.g., `PB,PG,VB,VG,Asst` per event line). Empty = all categories required (backward compatible).

## Sheet Layout

Current columns: A-R (A=registeredDateTimeAD, B=regDateBS, C=clientName, D-H=event info, I-R=crew assignments). Columns S-Z are currently unused.

**Column AA (index 26)** will store required categories per event as newline-separated strings, e.g.:
```
PB,PG,VB,VG,Asst,iPhone
PB,VB,Drone
```

## Category Codes

| Code | Field | Label |
|------|-------|-------|
| PB | photographerBride | Photographer Bride |
| PG | photographerGroom | Photographer Groom |
| VB | videographerBride | Videographer Bride |
| VG | videographerGroom | Videographer Groom |
| EP | extraPhotographer | Extra Photographer |
| EV | extraVideographer | Extra Videographer |
| Asst | assistant | Assistant |
| iPhone | iphoneShooter | iPhone Shooter |
| Drone | droneOperator | Drone Operator |
| FPV | fpvOperator | FPV Operator |

## Changes

### 1. Backend -- `supabase/functions/google-sheets/index.ts`

**Read range expansion (7 functions):**
All functions that read `A2:R...` from the FREELANCERS sheet must expand to `A2:AA...`:
- `getAllFreelancerAssignments` -- read range to `A2:AA5000`, parse `row[26]` as requiredCategories per event
- `getClientFreelancerAssignments` -- read range to `A2:AA1000`, include requiredCategories in output
- `updateFreelancerAssignmentAction` -- read range to `A2:AA1000` (no change to write logic)
- `restoreFreelancerAssignmentsAction` -- read range to `A2:AA1000`
- `checkFreelancerAvailability` -- read range to `A2:AA1000`
- `getFreelancerBookings` -- read range to `A2:AA1000`
- `syncSingleClientToFreelancers` -- read range to `A2:AA1000`
- `fullSyncFreelancerAssignments` -- read range to `A2:AA1000`

**Write range expansion:**
- `syncSingleClientToFreelancers` -- append range `A:AA` (instead of `A:R`), new rows include empty Column AA
- `fullSyncFreelancerAssignments` -- append range `A:AA`, new rows include empty Column AA
- `getClientFreelancerAssignments` -- append range `A:AA` when creating new client row

**New action: `updateRequiredCrewCategories`**
- Input: `registeredDateTimeAD`, `eventName`, `eventDateAD`, `categories` (comma-separated string like "PB,VB,Drone")
- Finds client row, determines event index, writes to Column AA at that event index (same newline-separated pattern as I-R)
- Registered as a new case in the action router

### 2. API Layer -- `src/lib/freelancer-assignment-api.ts`

- Add `requiredCategories: string` to `FreelancerAssignment` interface
- Add `CATEGORY_CODES` constant mapping `FreelancerField` to short codes
- Add `updateRequiredCrewCategories(registeredDateTimeAD, eventName, eventDateAD, categories)` function
- Add `CATEGORY_CODE_TO_FIELD` reverse mapping

### 3. Client Detail -- Event Detail Cards

**`src/components/client-detail/FullScreenEventCard.tsx`**
- Add a "Freelancers" button in the collapsed card header area (next to the status badge)
- Clicking opens a popup/dialog with 10 circular toggles arranged in a floating layout
- Each circle shows the short code (PB, PG, etc.)
- Unselected = gray outline, Selected = green filled
- Saves to backend via `updateRequiredCrewCategories`
- Selected categories appear as small green badges on the collapsed card header
- Props: needs `registeredDateTimeAD`, `eventDateAD`, `requiredCategories`, and `onUpdateCategories` callback

**`src/components/client-detail/FreelancerAssignmentSection.tsx`**
- Each `EventAssignmentCard` reads `requiredCategories` from the assignment data
- Only renders dropdowns for roles that are in the required list
- If `requiredCategories` is empty, all roles shown (backward compatible)
- Non-required roles are completely hidden (not shown at all on client detail)

### 4. All Clients Crew Table

**`src/components/suite/AllClientsCrewTable.tsx`**
- `CrewCell` receives new prop `isRequired: boolean`
- When `isRequired` is `false`: renders a **black/dark background cell** with no interaction (no popover, no plus icon) -- just a dark cell indicating "Not Required"
- When `isRequired` is `true` (or requiredCategories empty = all required): normal behavior
- Add a small "+" button in the Event column (or as an extra column) per event row
- Clicking the "+" opens the same circular category selector popup
- Adding a category removes the black cell and enables assignment
- Mobile layout: same logic -- black badge for "not required" roles
- Already-assigned freelancers in "not required" categories will display with a muted/strikethrough style but won't lose their data

### 5. New Shared Component

**`src/components/shared/CrewCategorySelector.tsx`** (new file)
- Reusable floating popup with 10 circular toggles
- Each circle: 40px round, shows short code, green when active, gray when inactive
- Arranged in a compact grid (5x2 or similar)
- Props: `selected: string[]`, `onChange: (codes: string[]) => void`, `onClose: () => void`
- Used by both FullScreenEventCard and AllClientsCrewTable

### 6. Hook Update

**`src/hooks/useFreelancerAssignments.ts`**
- No structural changes needed -- the `requiredCategories` field flows through naturally from the API response

## Backward Compatibility

- Empty Column AA = all categories required (existing clients work without changes)
- Already-assigned freelancers in "not required" slots keep their data in the sheet -- the UI just shows them as muted
- Sync functions preserve Column AA data the same way they preserve I-R (pad/trim on event count changes)

## Data Flow

```text
User clicks "Freelancers" button on event card
  -> Opens CrewCategorySelector popup
  -> Toggles PB, VB, Drone ON
  -> Saves "PB,VB,Drone" to Column AA via updateRequiredCrewCategories
  -> FreelancerAssignmentSection re-renders showing only PB, VB, Drone dropdowns
  -> All Clients table shows black cells for PG, VG, EP, EV, Asst, iPhone, FPV
  -> "+" button on All Clients allows adding more categories later
```

