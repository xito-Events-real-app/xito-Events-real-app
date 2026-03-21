

## Fix: Booked Calendar Shows POSTPONED/CANCELLED Clients

### Root Cause
When checking if a client is "booked" for calendar display, the code uses:
```
_source === 'booked' || (status.includes('BOOKED') && !status.includes('SOMEWHERE ELSE'))
```
The `_source === 'booked'` check **bypasses status validation**. Mandira Neupane's record has `_source = 'booked'` but her status is now POSTPONED. The booked clients page filters correctly because `loadBookedClientsFromCache` validates the actual status, but the tracker calendar does not.

### Fix
Add a status exclusion check whenever `_source === 'booked'` is used. A client with `_source === 'booked'` should still be excluded if their current status is POSTPONED, CANCELLED, or similar non-active statuses.

The condition changes from:
```
_source === 'booked' || (status.includes('BOOKED') && ...)
```
To:
```
(_source === 'booked' || (status.includes('BOOKED') && ...)) 
  && !status.includes('POSTPONED') && !status.includes('CANCELLED')
```

### Files to modify

1. **`src/components/shared/BookingCalendarMini.tsx`** — Lines 26 and 53: Add POSTPONED/CANCELLED exclusion to both the `bookedClientIds` filter and the `isBooked` check inside `calendarData`

2. **`src/components/desktop/DesktopDashboard.tsx`** — Lines 134 and 406: Same fix for both `bookedClientIds` filter and `isBooked` in calendar data computation

3. **`src/pages/Dashboard.tsx`** — Lines 276 and 429: Same fix for mobile dashboard hot dates and calendar logic

