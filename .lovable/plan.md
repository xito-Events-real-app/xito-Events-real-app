

# Add Booking Calendar Popup + Refresh Button for Each Freelancer

## Overview

Add two buttons next to each assigned freelancer's name in the assignment section:
1. **Calendar icon button** - Opens a Dialog popup showing that freelancer's personal booking calendar (same 12-month grid style as the FreelancerProfile page)
2. **Refresh icon button** - Refreshes that freelancer's booking data on demand

## Changes

### File: `src/components/client-detail/FreelancerAssignmentSection.tsx`

**1. Add state for the calendar popup:**
- `calendarOpenFor: string | null` - tracks which freelancer's calendar is open
- `calendarBookings: FreelancerBooking[]` - stores fetched booking data
- `calendarLoading: boolean` - loading state during fetch

**2. Add buttons in `renderFreelancerRow` (after the name, before toggles):**
- A small Calendar icon button that sets `calendarOpenFor` to the freelancer name and fetches their bookings via `getFreelancerBookings(name)`
- A small RefreshCw icon button that re-fetches the freelancer's bookings (calls the same API, shows a brief spin animation)

**3. Add a Dialog at the bottom of the component:**
- Shows the freelancer name in the header
- Renders a 12-month Nepali calendar grid (same layout as FreelancerProfile page) using the fetched bookings
- Each booked day shows as an emerald circle; hovering shows a popup with event details
- Dialog is wide enough (max-w-4xl) to show the calendar grid nicely

**4. Calendar grid logic (extracted inline):**
- Reuse the same `calendarData` calculation from FreelancerProfile (map bookings to a 12-month grid starting from Baisakh 2082)
- Render months in a 3-column grid with day circles
- Hover popups show client name, event name, and role

### Visual Layout

In each freelancer row, the name area becomes:
```
[PB] Barun [calendar-icon] [refresh-icon]    [toggles...] [+Note]
```

The calendar popup Dialog shows:
```
+------------------------------------------+
| Barun - Booking Calendar            [X]  |
|------------------------------------------|
| Baisakh 2082  | Jestha 2082  | Ashar 2082|
| 1 2 3 (4) ... | 1 2 (3) ... | ...       |
|               |              |           |
| ...12 months total...                    |
+------------------------------------------+
```

### Technical Notes

- Import `getFreelancerBookings` and `FreelancerBooking` from `@/lib/freelancer-assignment-api`
- Import `NEPALI_MONTHS` from `@/lib/nepali-months`
- Import `RefreshCw, Calendar` from `lucide-react`
- Import `ScrollArea` from `@/components/ui/scroll-area`
- The refresh button spins while loading and calls the same `getFreelancerBookings` API
- Calendar data computation is done inline (same algorithm as FreelancerProfile)
- Day hover popup reuses inline rendering (simplified version without navigation)

### Files Modified

| File | Change |
|---|---|
| `src/components/client-detail/FreelancerAssignmentSection.tsx` | Add calendar popup Dialog, calendar/refresh buttons per freelancer row |

