
# Filter Past Dates from Hot Dates and Cold Dates

## What This Does
Events where the BS (Nepali) date has already passed will no longer appear in Hot Dates or Cold Dates sections anywhere in the app. This keeps these sections focused on actionable, future opportunities only. Counts will also update accordingly.

## Files to Modify

### 1. `src/pages/Dashboard.tsx` (Mobile Dashboard)
- **Hot Dates** (line ~253): Add `isBSDatePast` check -- skip events where the date has passed. The `isCompleted` field is already computed but not used as a filter.
- **Cold Dates** (line ~329): Add same `isBSDatePast` check -- skip past-date events from both booking counts and enquiry tracking.

### 2. `src/components/desktop/DesktopDashboard.tsx` (Desktop Dashboard)
- **Hot Dates** (line ~246): Add `isBSDatePast` filter to skip past events during grouping.
- **Cold Dates** (line ~322): Add `isBSDatePast` filter to skip past events.

### 3. `src/pages/HotDates.tsx` (Dedicated Hot Dates page)
- **Hot Dates** (line ~63): Add `isBSDatePast` filter to skip past events. The `isCompleted` flag exists but isn't used to exclude -- add `.filter(d => !d.isCompleted)` or skip during grouping.

### 4. `src/components/booked/DesktopBookedDashboard.tsx` (Booked Dashboard Hot Dates)
- **Hot Dates** (line ~236): Already has `isCompleted` flag and pushes completed to end. Change to fully exclude past dates instead of just sorting them last.

### 5. `src/lib/fresh-client-utils.ts` (`getColdDatesClients`)
- **Cold Dates utility** (line ~94): Add `isBSDatePast` check to skip past-date events. This affects the Cold Dates count in the Suite mobile landing, Fresh Clients tabs, and Desktop Sidebar.

## Technical Approach

In each location, within the `events.forEach` loop, add an early return for past dates:

```typescript
// Skip past dates
if (isBSDatePast(event.year, event.month, event.day)) return;
```

This single line, added right after the existing `if (!event.year || !event.month || !event.day) return;` check in each loop, filters out all past events from both the grouping logic and the resulting counts.

For the Booked Dashboard (`DesktopBookedDashboard.tsx`), change the existing "push completed to end" sort to a hard filter: `result = result.filter(d => !d.isCompleted)`.

All 5 files already import or have access to `isBSDatePast` from `@/lib/nepali-date`.
