

# Fix ALL CLIENTS: Sync, Filters, Names, Layout, and Day Grouping

## Problems Identified

1. **No data on first load**: The `BOOKED CLIENTS FREELANCERS` sheet may be empty or stale. There is no sync trigger when opening ALL CLIENTS -- it just reads whatever is already there.
2. **Filters broken**: The sheet stores month as a TEXT name (e.g., `"MAGH"`) but the filter compares it with a number string (`"10"`). They never match, so all rows are filtered out.
3. **Freelancer names take too much space**: Full names overflow the cells.
4. **Drone/FPV columns are same size as PB-iPhone**: They should be narrower since they are rarely used.
5. **Same-day events blend together**: No visual grouping for events on the same day.

---

## Changes

### 1. Add Sync Button + Auto-Sync Every 30 Minutes

Add a prominent "Sync Clients" button in the header bar that calls `fullSyncFreelancerAssignments()` to copy latest booked clients into the FREELANCERS sheet before loading data.

On first load, the component will auto-sync, then reload the table. A `setInterval` will re-sync every 30 minutes in the background.

**File: `src/components/suite/AllClientsCrewTable.tsx`**

### 2. Fix Month Filter Mismatch

The sheet stores month names like `MAGH`, `FALGUN`, etc. The filter dropdown uses index numbers (`1`-`12`). Fix by converting the filter month number to the corresponding month name before comparing, using the existing `NEPALI_MONTHS` map from `nepali-months.ts`.

The filter logic changes from:
```
a.eventMonth === selectedMonth  // "MAGH" === "10" = NEVER MATCHES
```
To:
```
a.eventMonth.toUpperCase() === NEPALI_MONTHS[parseInt(selectedMonth)]  // "MAGH" === "MAGH"
```

**File: `src/components/suite/AllClientsCrewTable.tsx`**

### 3. Show Half Name + Hover Card with Upcoming Events

Each assigned freelancer cell will show only the **first name** (or first 8 characters). On hover, a `HoverCard` appears showing:
- Full name
- Up to 5 upcoming events from the loaded assignments data (same freelancer name appearing in other rows with future dates)

This uses the already-loaded `assignments` array to find upcoming bookings -- no extra API call needed.

**File: `src/components/suite/AllClientsCrewTable.tsx`** (CrewCell component)

### 4. Resize Columns -- Drone/FPV Smaller, PB through iPhone Bigger

Update the column width definitions:
- PB, PG, VB, VG, EP, EV, Asst, iPhone: `min-w-[120px]` (wider)
- Drone, FPV: `min-w-[80px]` (narrower)

Add a `width` property to the `CREW_COLUMNS` config.

**File: `src/components/suite/AllClientsCrewTable.tsx`**

### 5. Same-Day Event Background Grouping

When sorting rows by day, events sharing the same day number get alternating group background colors (e.g., light violet vs light blue) so they visually cluster together. A simple algorithm tracks "current day" and toggles a color flag when the day changes.

**File: `src/components/suite/AllClientsCrewTable.tsx`**

---

## Technical Details

### File: `src/components/suite/AllClientsCrewTable.tsx`

All changes are in this single file:

**Sync button and auto-sync:**
- Import `fullSyncFreelancerAssignments` from the API
- Add a `handleSync` function that calls `fullSyncFreelancerAssignments()`, then reloads data
- Add a "Sync Clients" button (with Database icon) next to the existing Refresh button in the header
- On first mount, call `handleSync` automatically (sync then load)
- Set up a `useEffect` with `setInterval` for 30-minute auto-sync (clears on unmount)

**Filter fix:**
- Import `NEPALI_MONTHS` from `@/lib/nepali-months`
- Change the filter comparison to normalize month names: convert selectedMonth number to the uppercase month name, then compare case-insensitively with `a.eventMonth`

**Half-name + hover card:**
- Import `HoverCard`, `HoverCardTrigger`, `HoverCardContent` from `@/components/ui/hover-card`
- In `CrewCell`, when a freelancer is assigned, display only `value.split(' ')[0]` (first name)
- Wrap the pill in a `HoverCard` that shows full name and up to 5 upcoming events
- Pass the full `assignments` array to `CrewCell` so it can search for other bookings by the same freelancer name

**Column widths:**
- Add a `width` field to `CREW_COLUMNS`: `'wide'` for PB through iPhone, `'narrow'` for Drone and FPV
- Apply `min-w-[120px]` for wide columns and `min-w-[80px]` for narrow in both `<th>` and `<td>`

**Same-day grouping:**
- In the render loop, compute a `dayGroup` map: for each unique day, assign an alternating index (0 or 1)
- Apply different background classes based on group index: group 0 gets `bg-white`, group 1 gets `bg-blue-50/40`
- This replaces the simple odd/even row striping

### Files Summary

| File | Change |
|------|--------|
| `src/components/suite/AllClientsCrewTable.tsx` | Sync button, auto-sync, filter fix, half-names with hover, column widths, day grouping |

