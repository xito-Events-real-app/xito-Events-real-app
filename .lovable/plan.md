

# Add Loading Indicator for Crew Schedule Detail Sheets

## What's Happening
When a freelancer taps "Full Details" or a client name on their crew schedule page, the venue/contact data takes 3-4 seconds to load from the database. Currently, the sheets open with empty/blank sections and no visual feedback, making freelancers think it's broken.

## The Fix
Add a loading spinner/skeleton state inside both the **CrewScheduleEventSheet** and **CrewScheduleClientSheet** components. The `isLoadingDetails` prop already exists and is passed through `EventDetailCard` -- we just need to forward it to the sheets and show a loader when data is being fetched.

## Changes

### 1. EventDetailCard.tsx
- Pass `isLoadingDetails` prop to both `CrewScheduleClientSheet` and `CrewScheduleEventSheet`
- Show a subtle "Loading..." text on the "Full Details" button while loading

### 2. CrewScheduleEventSheet.tsx
- Accept new `isLoading` prop
- When `isLoading` is true and no `eventDetail`/`contactDetails` exist yet, show a centered spinner with "Loading event details..." message instead of the empty content area

### 3. CrewScheduleClientSheet.tsx
- Accept new `isLoading` prop
- When `isLoading` is true and no `contactDetails` exist yet, show a centered spinner with "Loading client details..." message

The spinner will use `Loader2` (already imported in the project) with a spin animation and a subtle text message, matching the existing dark theme of the crew schedule page.

## Technical Details

| File | Change |
|------|--------|
| `src/components/crew-schedule/EventDetailCard.tsx` | Forward `isLoadingDetails` to both sheet components; show loading state on button |
| `src/components/crew-schedule/CrewScheduleEventSheet.tsx` | Add `isLoading` prop; render spinner overlay when loading |
| `src/components/crew-schedule/CrewScheduleClientSheet.tsx` | Add `isLoading` prop; render spinner overlay when loading |

