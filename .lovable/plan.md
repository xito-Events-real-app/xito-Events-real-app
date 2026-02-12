
# Fix Crew Table: Text Display, Hover Card Improvements

## Issues to Fix

### 1. Client Name & Event Name Truncated in Desktop Table
The client name column has `max-w-[170px]` and event column has `max-w-[140px]` with `truncate`, cutting off text even when there's space. Remove these max-width constraints and let the columns use their full allocated width (180px for client, 140px for event). Also remove the `truncate` class so text wraps naturally, and only shrink font if the name is very long.

### 2. Hover Card: Show Total Events This Month (Matching Current Filter)
Currently `FreelancerHoverInfo` shows up to 5 events from ALL assignments regardless of month. Fix: pass `selectedYear` and `selectedMonth` to the component, filter events to only the current filter month, and show a count like "3 events this month". Then separately show only future/upcoming events (not past ones).

### 3. Hover Card: Filter Out Past Events
Currently shows all matched events including past ones. Fix: compare event dates against today's BS date and only show events where `eventDay >= currentDay` (within the current month) or events in future months.

### 4. Hover Card: Better Layout (Date First, No Truncation, No Clipping)
Currently shows: `clientName -- event (day month)` truncated in a single line. Fix:
- Show date first: "Day MonthName" on the left
- Then client name on its own line
- Then event name on its own line
- Remove `truncate` so all text is fully visible
- Use `side="bottom"` with `avoidCollisions={true}` and `collisionPadding={16}` on `HoverCardContent` so freelancers at the top of the screen get their hover card below them instead of being cut off

## Technical Details

### File: `src/components/suite/AllClientsCrewTable.tsx`

**Client/Event text (lines 400-410):** Remove `max-w-[170px]` from client button, remove `max-w-[140px]` from event span. Let text wrap if needed rather than truncate.

**FreelancerHoverInfo (lines 447-488):** Refactor to:
- Accept `selectedYear` and `selectedMonth` props
- Filter events to only the selected month/year
- Show total count: "X events in [MonthName]"
- Further filter to only upcoming events (day >= today's BS day if same month/year, or all if future month)
- Layout each event as: date line, client line, event line (no truncation)

**HoverCardContent (lines 327, 538):** Change `side="top"` to `side="bottom"` with `avoidCollisions={true}` and `collisionPadding={16}` so cards near the top of the screen don't get clipped.

**Pass filter context:** Thread `selectedYear` and `selectedMonth` from the main component down to `CrewCell` and mobile hover cards, then into `FreelancerHoverInfo`.

| Change | Location |
|--------|----------|
| Remove max-width on client/event columns | Lines 403, 409 |
| Update FreelancerHoverInfo to filter by month, exclude past, show count | Lines 447-488 |
| Fix HoverCardContent positioning to avoid clipping | Lines 327, 538 |
| Pass selectedYear/selectedMonth to CrewCell and hover components | Multiple locations |
