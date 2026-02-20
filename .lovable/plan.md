
# Fix: Booking Calendar Button Hangs When Clicked in Expanded Row

## Root Cause

When the calendar icon button is clicked next to a freelancer name in an expanded row, `setCalendarFor(name)` triggers a re-render of the entire `EventLogisticsPanel`. On every re-render, two large objects (`mappedAssignment` and `mappedEventDetail`) are recreated as brand-new references (lines 1389-1434). The `CrewScheduleEventSheet` receives these as props, its `useEffect` (line 134-156) fires because `assignment.event` is technically a new string reference each render, which triggers a Supabase query, which sets `visibility` state, which triggers another re-render of the Sheet, and so on -- creating a cascade of re-renders that locks up the UI.

Additionally, the button click may bubble up through the table row's click handler (which navigates to client detail), causing competing navigation and state changes.

## The Fix (single file: AllClientsCrewTable.tsx)

### 1. Add `e.stopPropagation()` to the calendar button click

On line 1352, the button's `onClick` should stop propagation so the click doesn't bubble up to the table row's click handler:

```tsx
<button
  onClick={(e) => { e.stopPropagation(); setCalendarFor(name); }}
  ...
```

### 2. Memoize `mappedAssignment` and `mappedEventDetail`

Move the object construction (lines 1388-1434) into `useMemo` hooks so they are stable references and don't trigger unnecessary re-renders in `CrewScheduleEventSheet`:

```tsx
const mappedAssignment = useMemo<AssignmentRow>(() => ({
  event_year: row.eventYear || null,
  // ...same fields...
}), [row]);

const mappedEventDetail = useMemo<EventDetail | undefined>(() => {
  if (!eventDetail) return undefined;
  return { /* ...same mapping... */ };
}, [eventDetail]);
```

### 3. Map `contactDetail` from snake_case to camelCase

The `CrewScheduleEventSheet` expects `ClientContactDetails` (camelCase: `brideFullName`) but receives raw Supabase cache data (snake_case: `bride_full_name`). Add a mapping:

```tsx
const mappedContactDetails = useMemo(() => {
  if (!contactDetail) return null;
  return {
    brideFullName: contactDetail.bride_full_name || '',
    brideContactNumber: contactDetail.bride_contact_number || '',
    brideWhatsappNumber: contactDetail.bride_whatsapp_number || '',
    brideHomeCity: contactDetail.bride_home_city || '',
    brideHomeArea: contactDetail.bride_home_area || '',
    brideHomeMap: contactDetail.bride_home_map || '',
    groomFullName: contactDetail.groom_full_name || '',
    groomContactNumber: contactDetail.groom_contact_number || '',
    groomWhatsappNumber: contactDetail.groom_whatsapp_number || '',
    groomHomeCity: contactDetail.groom_home_city || '',
    groomHomeArea: contactDetail.groom_home_area || '',
    groomHomeMap: contactDetail.groom_home_map || '',
  } as ClientContactDetails;
}, [contactDetail]);
```

### 4. Add `useMemo` to imports

Ensure `useMemo` is imported from React at the top of the file.

## Summary of Changes

| Line(s) | What |
|---------|------|
| Import line | Add `useMemo` to React imports |
| ~1352 | Add `e.stopPropagation()` to calendar button onClick |
| ~1388-1406 | Wrap `mappedAssignment` in `useMemo` |
| ~1408-1434 | Wrap `mappedEventDetail` in `useMemo` |
| New (~1436) | Add `mappedContactDetails` with snake-to-camelCase mapping in `useMemo` |
| ~1447 | Pass `mappedContactDetails` instead of raw `contactDetail` |

No schema changes. No new files. Only `AllClientsCrewTable.tsx` is modified.
