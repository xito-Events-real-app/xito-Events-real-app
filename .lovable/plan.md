

# Fix Required Categories Display and Add Dashboard Freelancer Assignment

## Problem Summary

1. **Event Details tab**: Column AA data exists but `requiredCategories` badges are not appearing on event cards. The matching logic uses strict `eventDateAD` comparison which fails when dates differ between sheets. Need to use the same `eventName + eventMonth + eventDay` composite key used elsewhere.

2. **Dashboard tab**: Currently only shows already-assigned freelancers. Need to also show required-but-unassigned roles (from Column AA) as empty slots with an option to assign freelancers directly from the Dashboard.

3. **All Clients page**: Already works with "Not Required" black cells. Just needs cache invalidation when assignments are made from other views.

## Changes

### 1. Fix matching logic in Event Details tab

**File: `src/pages/ClientDetail.tsx`** (line ~1132-1135)

The current matching uses `eventDateAD` which can be empty or inconsistent. Change to match by `event name + eventMonth + eventDay` (same pattern used in `DashboardEventDetails.findAssignment`):

```typescript
// BEFORE (broken):
a.event.trim() === (eventDetail.eventName || '').trim() 
  && a.eventDateAD.trim() === (eventDetail.eventDateAD || '').trim()

// AFTER (robust):
a.event?.trim().toLowerCase() === (eventDetail.eventName || '').trim().toLowerCase()
  && String(a.eventMonth)?.trim() === String(eventDetail.eventMonth)?.trim()
  && String(a.eventDay)?.trim() === String(eventDetail.eventDay)?.trim()
```

### 2. Add freelancer assignment capability to Dashboard tab

**File: `src/components/client-detail/DashboardEventDetails.tsx`**

- Import `useFreelancerAssignments` hook and `CrewCategorySelector`
- For each event that has a matching assignment with `requiredCategories`:
  - Show **required but unassigned** roles as empty colored badges with a "+" or "Assign" action
  - Clicking opens a freelancer assignment popover (reusing the same combobox pattern from `FreelancerAssignmentSection`)
- For already-assigned roles: keep the current clickable name display
- Add props: `registeredDateTimeAD` so the hook can fetch/update assignments
- Show `CategoryBadges` for the required categories even when no one is assigned yet

Changes to DashboardEventDetailsProps:
```typescript
interface DashboardEventDetailsProps {
  eventDetailsData: EventDetailsData | null;
  isLoading?: boolean;
  clientEvents?: ClientEventsData;
  freelancerAssignments?: FreelancerAssignment[];
  registeredDateTimeAD?: string;  // NEW - for assignment updates
  onAssignmentUpdate?: () => void; // NEW - callback to refresh data
}
```

For each event row in the Dashboard:
- Parse `assignment.requiredCategories` to get required role codes
- Show assigned roles as before (name + badge)
- Show unassigned-but-required roles as empty colored badges with a small combobox trigger
- When a freelancer is assigned, call `updateAssignment` and trigger refresh

### 3. Pass `registeredDateTimeAD` to Dashboard component

**File: `src/pages/ClientDetail.tsx`** (where `DashboardEventDetails` is rendered via `ClientHeroSection`)

Pass `registeredDateTimeAD` through to `ClientHeroSection` and down to `DashboardEventDetails`.

**File: `src/components/client-detail/ClientHeroSection.tsx`**

Accept and forward `registeredDateTimeAD` prop to `DashboardEventDetails`.

### 4. Refresh freelancer assignments after category update

**File: `src/pages/ClientDetail.tsx`**

After `updateRequiredCrewCategories` is called from the Event Details tab, refetch freelancer assignments so the Dashboard and Event Details both reflect the latest data. Add a re-fetch mechanism to the `useFreelancerAssignments` hook or reset its `fetchedRef`.

**File: `src/hooks/useFreelancerAssignments.ts`**

Expose a `refetch` function that resets `fetchedRef` and re-runs the load:
```typescript
const refetch = useCallback(async () => {
  fetchedRef.current = false;
  // trigger reload
}, []);
```

## Technical Details

### Dashboard assignment flow:
```
User sees Dashboard tab
  -> Required categories shown as colored badges per event
  -> Unassigned roles show empty badge with "+" icon
  -> Click "+" opens freelancer combobox (filtered by role)
  -> Select freelancer -> calls updateAssignment
  -> Badge updates to show name
  -> Change reflects in All Clients page on next refresh
```

### Files to modify:
1. `src/pages/ClientDetail.tsx` - Fix matching, pass registeredDateTimeAD
2. `src/components/client-detail/DashboardEventDetails.tsx` - Add assignment UI for required categories
3. `src/components/client-detail/ClientHeroSection.tsx` - Forward new props
4. `src/hooks/useFreelancerAssignments.ts` - Add refetch capability

