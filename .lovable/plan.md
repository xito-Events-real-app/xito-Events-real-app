

# Freelancer Assignment Section in Client Detail Page

## Overview
Add a new "Freelancers" sidebar section to the Client Detail page that allows assigning freelancers (from the WTN FREELANCERS spreadsheet) to specific events. Assignments are stored in a new "BOOKED CLIENTS FREELANCERS" sheet with auto-row creation from event details, double-booking detection, and role-filtered dropdowns.

---

## Architecture

### Data Flow
1. **Event data source**: "BOOKED CLIENTS EVENT DETAILS" sheet provides the events (Client Name, Event, Event Date AD, etc.)
2. **Assignment storage**: New "BOOKED CLIENTS FREELANCERS" sheet (Columns A-H for identity + additional columns for freelancer roles)
3. **Dropdown source**: "WTN FREELANCERS" spreadsheet, "FREELANCERS" sheet -- filtered by role YES/NO columns
4. **Double-booking check**: Search all rows in "BOOKED CLIENTS FREELANCERS" for same freelancer name + same Event Date AD but different client

### Sheet Schema: "BOOKED CLIENTS FREELANCERS"
| Column | Field |
|--------|-------|
| A | Registered Date & Time (from Event Details Col A) |
| B | Registered Date BS (from Event Details Col B) |
| C | Client Name (from Event Details Col C) |
| D | Event (from Event Details Col D) |
| E | Event Year (from Event Details Col E) |
| F | Event Month (from Event Details Col F) |
| G | Event Day (from Event Details Col G) |
| H | Event Date in AD (from Event Details Col H) |
| I | Photographer Bride |
| J | Photographer Groom |
| K | Videographer Bride |
| L | Videographer Groom |
| M | Extra Photographer |
| N | Extra Videographer |
| O | Assistant |
| P | iPhone Shooter |
| Q | Drone Operator |
| R | FPV Operator |

**Unique Key**: Client Name + Event + Event Date in AD (no duplicate rows)

---

## Implementation Steps

### Step 1: Backend -- Edge Function Actions (supabase/functions/google-sheets/index.ts)

Add 3 new actions to the edge function:

1. **`getClientFreelancerAssignments`** -- Given `registeredDateTimeAD`, fetch all rows from "BOOKED CLIENTS FREELANCERS" matching that client. If no rows exist, auto-create them by reading from "BOOKED CLIENTS EVENT DETAILS" and mapping Columns A-H.

2. **`updateFreelancerAssignment`** -- Given `registeredDateTimeAD`, `eventName`, `eventDateAD`, and a field/value pair (e.g., `photographerBride: "Ram Sharma"`), update the corresponding cell in the correct row.

3. **`checkFreelancerAvailability`** -- Given a freelancer name and an event date (AD), search all rows in "BOOKED CLIENTS FREELANCERS" for any assignment of that name on that date. Return list of conflicts (client name + event).

Also add these to the `SheetRequest` action union type and the main switch/case router.

### Step 2: Frontend API Layer (src/lib/freelancer-assignment-api.ts)

New file with functions:
- `getClientFreelancerAssignments(registeredDateTimeAD)` -- calls edge function
- `updateFreelancerAssignment(registeredDateTimeAD, eventName, eventDateAD, field, value)` -- auto-save on selection
- `checkFreelancerAvailability(name, dateAD)` -- for double-booking warnings
- `getFilteredFreelancersByRole(role)` -- calls existing `getFreelancers` then filters client-side by role column (e.g., `photographer === 'YES'`)

### Step 3: Custom Hook (src/hooks/useFreelancerAssignments.ts)

Hook that:
- Fetches assignments for the current client on mount
- Fetches freelancer list (cached) for dropdowns
- Provides `updateAssignment(eventIndex, field, value)` with auto-save
- Provides `checkAvailability(name, dateAD)` returning conflict info
- Manages loading/error states

### Step 4: Sidebar Update (src/components/client-detail/ClientDetailSidebar.tsx)

- Add `'freelancers'` to the `SectionType` union
- Add sidebar item: `{ id: 'freelancers', label: 'Freelancers', icon: UserCog }`
- Place it after 'events' in the list

### Step 5: UI Component (src/components/client-detail/FreelancerAssignmentSection.tsx)

New component rendering per-event freelancer assignments:

**Layout per event card:**
- Event header (name + date)
- Two-column grid:
  - Row 1: Photographer Bride | Photographer Groom
  - Row 2: Videographer Bride | Videographer Groom
  - Row 3: Extra Photographer | Extra Videographer
  - Row 4: Assistant | iPhone Shooter
- Collapsible "See More" button revealing:
  - Drone Operator | FPV Operator

**Each field** is a searchable Combobox dropdown:
- Options filtered by role (Photographer fields show only freelancers where `photographer === 'YES'`, etc.)
- Role mapping:
  - Photographer Bride/Groom, Extra Photographer -> `photographer = YES`
  - Videographer Bride/Groom, Extra Videographer -> `videographer = YES`
  - Assistant -> `hybridShooter = YES`
  - iPhone Shooter -> `iphoneShooter = YES`
  - Drone Operator -> `droneOperator = YES`
  - FPV Operator -> `fpvOperator = YES`
- Visual indicators in dropdown:
  - Green dot = available on that date
  - Red dot = already booked (with tooltip showing which client)
- On selection: show warning toast if double-booked but allow override
- Auto-save immediately on selection

**Styling**: Dark theme consistent with existing Client Detail page (bg-white/5, border-white/10, text-white)

### Step 6: Wire into ClientDetail.tsx

- Import `FreelancerAssignmentSection`
- Add `{activeSection === 'freelancers' && <FreelancerAssignmentSection ... />}` block after the keepNotes section
- Pass `registeredDateTimeAD` and event details data

---

## Technical Details

### Auto-Row Creation Logic (Backend)
When `getClientFreelancerAssignments` is called:
1. Read "BOOKED CLIENTS FREELANCERS" for rows matching `registeredDateTimeAD`
2. Read "BOOKED CLIENTS EVENT DETAILS" for the same client's events
3. For each event in Event Details that does NOT have a corresponding row in Freelancers sheet (matched by Client Name + Event + Event Date AD):
   - Insert a new row with Columns A-H populated
   - Leave Columns I-R empty (for user assignment)
4. Return all assignment rows for this client

### Double-Booking Check Logic (Backend)
1. Read all rows from "BOOKED CLIENTS FREELANCERS" (Columns C, D, H, I-R)
2. For each row, check all freelancer columns (I-R)
3. If the selected name appears in any column where Column H matches the target date AND Column C is a different client, flag as conflict
4. Return array of `{ clientName, event, role }` conflicts

### Dropdown Filtering (Frontend)
Use the existing `getFreelancers()` API, then filter in-memory:
```text
Role -> Filter Column
Photographer fields -> photographer = YES
Videographer fields -> videographer = YES
Assistant -> hybridShooter = YES
iPhone Shooter -> iphoneShooter = YES
Drone Operator -> droneOperator = YES
FPV Operator -> fpvOperator = YES
```

---

## Files to Create
- `src/lib/freelancer-assignment-api.ts`
- `src/hooks/useFreelancerAssignments.ts`
- `src/components/client-detail/FreelancerAssignmentSection.tsx`

## Files to Modify
- `supabase/functions/google-sheets/index.ts` (add 3 actions + functions)
- `src/components/client-detail/ClientDetailSidebar.tsx` (add freelancers section type + menu item)
- `src/components/client-detail/index.ts` (export new component)
- `src/pages/ClientDetail.tsx` (render freelancers section, import hook)

