

# Crew Display & Remove Freelancer Improvements

## 4 Changes Requested

### 1. Show Crew Names in Mobile Upcoming Events (TodayEventsHero)
Currently, the `TodayEventsHero` component shows venue, parlour, timing, demands, and references but does NOT show assigned crew. We need to fetch freelancer assignments and display them on each event card.

- Import `getAllFreelancerAssignments` and fetch assignments alongside event details
- Match assignments to events using the same logic as `DashboardEventDetails` (event name + month + day matching)
- Display assigned crew as compact color-coded role-name pills below the venue/parlour section (e.g., "PB: Ram", "VB: Hari")

### 2. Reorder Crew Columns: PB, VB, PG, VG First
In `AllClientsCrewTable.tsx`, the current order is PB, PG, VB, VG. Change to **PB, VB, PG, VG** so bride-side roles come together followed by groom-side.

Similarly update `DashboardEventDetails.tsx` ROLE_CONFIG order, and the new mobile crew display.

### 3. Mobile-Friendly Card Layout for ALL CLIENTS Crew Table
The `AllClientsCrewTable` currently renders as a horizontal table which is hard to use on mobile. When viewed on mobile (the "Crew" tab in `MobileSuiteLanding`), transform the layout from a wide table to a **vertical card structure**:

Each card will show:
- Event date (day badge) and client name at top
- Event name below
- Crew assignments as a 2-column grid of role-name pairs
- Color-coded by role group (amber for photo, purple for video, emerald for assist, cyan for tech)

This will be done by detecting mobile width and rendering cards instead of the table rows.

### 4. Remove Freelancer Option in Both Versions
- **AllClientsCrewTable (Desktop)**: Add a "Clear" option in the `CrewCell` popover command list (similar to how `FreelancerAssignmentSection` already has "Clear selection"). When clicked, call `handleAssign(row, field, '')` to clear the value.
- **AllClientsCrewTable (Mobile cards)**: Each assigned crew member will have a small X button to remove the assignment.
- **FreelancerAssignmentSection**: Already has "Clear selection" -- no changes needed.

## Technical Details

### File: `src/components/suite/TodayEventsHero.tsx`
- Import `getAllFreelancerAssignments` and `FreelancerAssignment` from freelancer-assignment-api
- Add a `useEffect` or integrate into useMemo to load assignments (using sessionStorage cache `crew_assignments_cache` for instant load)
- In each event card, after the venue/parlour section, render matched crew as inline pills
- Use the same ROLE_CONFIG pattern from DashboardEventDetails with reordered roles (PB, VB, PG, VG first)

### File: `src/components/suite/AllClientsCrewTable.tsx`
- Reorder `CREW_COLUMNS` array: PB, VB, PG, VG, EP, EV, Asst, iPhone, Drone, FPV
- Add mobile detection using `useIsMobile()` hook
- When mobile, render a card-based layout instead of the table:
  - Each card: date badge + client name header, event name, then a grid of assigned roles
  - Each role shows label + name with an X button to remove
  - Empty roles show a "+" button to assign via the same popover
- In desktop `CrewCell`: Add a "Clear" CommandItem at the top of the list when a value exists, calling `onAssign('')`

### File: `src/components/client-detail/DashboardEventDetails.tsx`
- Reorder `ROLE_CONFIG` to: PB, VB, PG, VG, EP, EV, Asst, iPhone, Drone, FPV

### Files Summary

| File | Changes |
|------|---------|
| `TodayEventsHero.tsx` | Add crew display on mobile upcoming events |
| `AllClientsCrewTable.tsx` | Reorder columns (PB,VB,PG,VG first); add mobile card layout; add remove/clear option in desktop cells |
| `DashboardEventDetails.tsx` | Reorder ROLE_CONFIG to PB,VB,PG,VG first |

