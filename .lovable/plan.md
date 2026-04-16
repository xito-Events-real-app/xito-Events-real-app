

# Wedding Side Timings Feature

## Overview
Add separate Bride Side / Groom Side timings for events containing "WEDDING" in the name. The original `event_start_time` / `event_end_time` columns are preserved as the "Master Timing" for backward compatibility.

## 1. Database Migration
Add 4 new columns to `event_details_cache`:
```sql
ALTER TABLE public.event_details_cache
  ADD COLUMN bride_start_time text DEFAULT '',
  ADD COLUMN bride_end_time text DEFAULT '',
  ADD COLUMN groom_start_time text DEFAULT '',
  ADD COLUMN groom_end_time text DEFAULT '';
```

## 2. Shared Helper — `src/lib/wedding-timing-utils.ts` (new file)
```typescript
export function isWeddingEvent(eventName: string): boolean {
  return (eventName || '').toUpperCase().includes('WEDDING');
}

export type TimingSide = 'bride' | 'groom' | 'both';

export function getFreelancerTimingSide(roleKey: string): TimingSide {
  const brideRoles = ['photographer_bride', 'videographer_bride'];
  const groomRoles = ['photographer_groom', 'videographer_groom'];
  if (brideRoles.includes(roleKey)) return 'bride';
  if (groomRoles.includes(roleKey)) return 'groom';
  return 'both';
}
```

## 3. `src/hooks/useEventDetails.ts`
- Add `brideStartTime`, `brideEndTime`, `groomStartTime`, `groomEndTime` to `EventDetail` interface
- Map them in `cacheRowToEventDetail()` from `row.bride_start_time` etc.
- Add them to the `updateEventDetail()` payload builder (same pattern as existing fields)
- **CRITICAL**: Never remove `eventStartTime`/`eventEndTime` — they continue to be saved. For wedding events, the form auto-copies bride start time into `eventStartTime` and bride end time into `eventEndTime` as fallback so older views still work.

## 4. `src/components/client-detail/FullScreenEventCard.tsx`
### Edit form (expanded):
- Add 4 new state variables: `brideStartTime`, `brideEndTime`, `groomStartTime`, `groomEndTime`
- Reset them in `useEffect` and `handleCancel`
- When `isWeddingEvent(eventName)`, replace the single "Event Timing" section with two color-coded sections:
  - **Bride Side Timing** (pink/rose border+labels) — `brideStartTime`, `brideEndTime`
  - **Groom Side Timing** (sky/blue border+labels) — `groomStartTime`, `groomEndTime`
- Non-wedding events keep the existing single "Event Timing" section unchanged
- In `handleSave`:
  - Include all 4 new fields in updates
  - For wedding events, auto-fill `eventStartTime = brideStartTime` and `eventEndTime = brideEndTime` if the master fields are empty (backward compat)

### Read-only view (collapsed):
- When wedding event, show "Bride: X-Y · Groom: X-Y" in the venue time range area instead of the single time range
- Non-wedding: unchanged

## 5. `src/components/crew-schedule/CrewScheduleEventSheet.tsx`
In the Venue section (lines 284-298), when `isWeddingEvent(assignment.event)`:
- Determine freelancer's role by matching `freelancerName` against assignment fields (PB/VB/PG/VG etc.)
- Get `timingSide` from `getFreelancerTimingSide(roleKey)`
- **Bride side (PB/VB)**: Show bride timing large + groom timing small below
- **Groom side (PG/VG)**: Show groom timing large + bride timing small below
- **Both (EP/EV/Asst/Drone/iPhone/FPV)**: Show both timings equally
- Non-wedding events: unchanged (show `eventStartTime`/`eventEndTime`)

## 6. `src/components/suite/AllClientsCrewTable.tsx` — `EventLogisticsPanel`
In the Venue card (lines 1664-1694), when `isWeddingEvent(row.event)`:
- Show two timing blocks: "Bride Starts at X / Ends Y" (pink) and "Groom Starts at X / Ends Y" (blue) instead of the single "Starts at" display
- Map the 4 new columns in `mappedEventDetail` (line 1528-1556)

## 7. `src/components/client-detail/EventDetailsSummaryCard.tsx`
- Add the 4 new fields to `getFilledCount` and `hasAnyDetails` checks
- In the Event Timing display section, when wedding, show bride/groom timings separately with pink/blue labels

## 8. `src/components/client-detail/DashboardEventDetails.tsx`
- In the timing display for each event, when wedding, show "Bride: X-Y · Groom: X-Y" instead of single timing

## Safety Guarantees
- `eventStartTime`/`eventEndTime` are never removed from the interface or database
- Non-wedding events use the exact same code path as before
- The 4 new columns default to empty string, so existing data is unaffected
- Saving a wedding event auto-fills master timing from bride timing for backward compat

## Files Changed
1. **New migration** — 4 columns on `event_details_cache`
2. **New file** `src/lib/wedding-timing-utils.ts`
3. `src/hooks/useEventDetails.ts` — interface + mapping + save
4. `src/components/client-detail/FullScreenEventCard.tsx` — edit form + read-only
5. `src/components/crew-schedule/CrewScheduleEventSheet.tsx` — role-based display
6. `src/components/suite/AllClientsCrewTable.tsx` — logistics panel
7. `src/components/client-detail/EventDetailsSummaryCard.tsx` — summary display
8. `src/components/client-detail/DashboardEventDetails.tsx` — timing display

