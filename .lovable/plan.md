

# Replace Calendar Popup with Freelancer Event Preview

## What You Get

When you click the calendar icon next to a freelancer's name (e.g., Barun), instead of a 12-month booking grid, you'll see the **exact same "Full Details" view** that the freelancer sees when they open their crew schedule link for this specific event. This lets you verify what details (bride contact, groom contact, venue, parlour, personal note, crew list, demands) are visible to that freelancer based on the switches you've toggled.

## How It Works

The popup will open the existing `CrewScheduleEventSheet` component (the same one used at `/crew-schedule/:freelancerName`) with this client's event data and the freelancer's visibility settings. It shows exactly what the freelancer would see -- respecting the ON/OFF toggle states.

## Technical Details

### File: `src/components/client-detail/FreelancerAssignmentSection.tsx`

**1. Remove the old calendar code:**
- Remove `calendarBookings` state, `calendarData` useMemo, `handleRefreshCalendar`, and the `FreelancerCalendarMonth` component (lines 203, 353-400, 744-800)
- Remove imports: `getFreelancerBookings`, `FreelancerBooking`, `NEPALI_MONTHS`, `ScrollArea`

**2. Add contact details fetching:**
- Import `useClientContactDetails` hook
- Call `useClientContactDetails(registeredDateTimeAD)` inside `EventAssignmentCard` to get bride/groom contact data
- This data is already cached, so no extra API calls in most cases

**3. Build the `AssignmentRow` object for `CrewScheduleEventSheet`:**
- Map the existing `assignment` data (which has `photographerBride`, `videographerBride`, etc.) to the `AssignmentRow` format (which uses `photographer_bride`, `videographer_bride`, etc.)
- Include `event_year`, `event_month`, `event_day`, `client_name`, `registered_date_time_ad`

**4. Replace the Dialog with a Sheet using `CrewScheduleEventSheet`:**
- Import `CrewScheduleEventSheet` from `@/components/crew-schedule/CrewScheduleEventSheet`
- When calendar icon is clicked, set `calendarOpenFor` to the freelancer name (no API call needed)
- Render `CrewScheduleEventSheet` with the mapped assignment row, event detail, contact details, and the freelancer name
- The sheet handles its own visibility settings fetch internally

**5. Keep the Refresh button:**
- The refresh button next to the freelancer name calls `refetch()` from `useFreelancerAssignments` to refresh the assignment data for the current client

### What the Popup Shows (same as freelancer's view)

- Event name, Nepali date, client name in header
- Personal note (if set)
- Crew list with all 10 roles and phone numbers
- Bride section (only if toggle is ON)
- Groom section (only if toggle is ON)
- Venue details (only if toggle is ON)
- Parlour details (only if toggle is ON)
- Demands and References

### Files Modified

| File | Change |
|---|---|
| `src/components/client-detail/FreelancerAssignmentSection.tsx` | Replace 12-month calendar Dialog with `CrewScheduleEventSheet`, add contact details hook, remove `FreelancerCalendarMonth` component |

