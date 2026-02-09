

## Fix: Event Date Changes Not Reflecting on Client Detail Page

### Root Cause

When you edit event dates for a booked client, the save updates the CLIENT TRACKER / BOOKED CLIENTS sheet and the local cache. However, the Client Detail dashboard uses **two data sources**:

1. **BOOKED CLIENTS EVENT DETAILS sheet** (via `useEventDetails` hook) -- contains event dates + logistics
2. **Client cache** (via `useCachedData`) -- fallback only

The `DashboardEventDetails` component **always prioritizes** the Event Details sheet data when available. After editing dates, the Event Details sheet still has the OLD dates because it was never updated or re-fetched with the new values.

### The Fix

After saving edited event dates in `ClientDetail.tsx` `handleSave`, we need to:

1. **Refetch event details** from the BOOKED CLIENTS EVENT DETAILS sheet so `DashboardEventDetails` picks up the updated dates
2. **Dispatch cache invalidation events** so other modules (booking calendar, booked clients) also refresh

### Technical Changes

**File: `src/pages/ClientDetail.tsx`**

In the `handleSave` function (around line 589-599), after `updateClient(updatedClient)` succeeds and `updateClientCache` is called:

- Add a call to the `useEventDetails` hook's `refetch` function to re-fetch event details from the sheet
- The `refetch` is already available as the hook returns it (line 162 of useEventDetails.ts), but it's not destructured in ClientDetail.tsx -- we need to add it

Current code (line 319-323):
```
const { 
    data: eventDetailsData, 
    isLoading: eventDetailsLoading, 
    updateEventDetail 
} = useEventDetails(client?.registeredDateTimeAD);
```

Change to also destructure `refetch`:
```
const { 
    data: eventDetailsData, 
    isLoading: eventDetailsLoading, 
    updateEventDetail,
    refetch: refetchEventDetails
} = useEventDetails(client?.registeredDateTimeAD);
```

Then in `handleSave`, after the cache update (after line 594), add:
```
// Refetch event details so DashboardEventDetails shows updated dates
refetchEventDetails();
```

This single change ensures that after saving edited dates, the Event Details sheet data is re-fetched and the dashboard displays the correct dates immediately.

### Files Summary

| File | Change |
|------|--------|
| `src/pages/ClientDetail.tsx` | Destructure `refetch` from `useEventDetails`, call it after save completes |

