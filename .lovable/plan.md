
# Split All Clients Table into Upcoming and Completed Sections

## What Changes

The "All Clients" crew table currently shows events sorted by day from earliest to latest. This change splits the table into two sections:

1. **Upcoming Events** (top) -- events where the BS date has not yet passed, sorted by day ascending
2. **Completed Events** (bottom) -- events where the BS date has passed, rendered with italic fonts

Both mobile card view and desktop table view will be updated.

## Technical Plan

### File: `src/components/suite/AllClientsCrewTable.tsx`

**1. Add two derived lists from `filteredRows`**

Using the existing `isBSDatePast()` function (already imported), split `filteredRows` into:
- `upcomingRows` -- events where `isBSDatePast(row.eventYear, row.eventMonth, row.eventDay)` is `false`
- `completedRows` -- events where it returns `true`

Both keep the same day-ascending sort order.

**2. Update the desktop table `<tbody>`**

Instead of rendering `filteredRows.map(...)` once, render:
- `upcomingRows.map(...)` with existing styling
- A separator row: `<tr>` with a colspan cell showing "Completed Events" header with a muted style
- `completedRows.map(...)` with an additional `italic` class on text elements (client name, event name, freelancer names)

**3. Update the mobile card layout**

Same split:
- Render `upcomingRows` cards first, preceded by a small "Upcoming Events" label
- A divider with "Completed Events" label
- Render `completedRows` cards with italic styling

**4. Apply italic styling to completed rows**

For completed events, add `italic text-gray-500` classes to:
- Client name
- Event name
- Freelancer names in crew cells
- Day badge gets a muted/gray style instead of violet

**5. Update stats calculations**

The `assignedCount`, `requiredCells`, `remainingCount` stats and `dayGroups`/`dayCounts` continue to use `filteredRows` (both sections combined) -- no change needed there.

**6. Handle edge cases**

- If all events are upcoming, no "Completed Events" section appears
- If all events are completed, no "Upcoming Events" header needed, just show completed
- Events with unknown days (`**`) treated as upcoming (cannot determine if past)
