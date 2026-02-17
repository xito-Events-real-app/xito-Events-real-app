

# Fix: Crew Schedule Showing Details When Switches Are OFF

## Problem

When you turn ON only "Bride Contact" for Barun, both Bride AND Groom details still appear in the freelancer's crew schedule view. There are three bugs:

1. When no settings row exists in the database for a freelancer, the code defaults everything to VISIBLE (should be HIDDEN)
2. Boolean checks use `!== false` which treats missing/null values as "show" instead of "hide"
3. The Client Detail Sheet (opened by tapping the client name badge) has NO visibility filtering at all -- it always shows everything

## Fix

### File: `src/components/crew-schedule/CrewScheduleEventSheet.tsx`

**Change 1 - Line 152**: Change the fallback defaults from `true` to `false`:
```tsx
// BEFORE (wrong)
setVisibility({ show_bride_details: true, show_groom_details: true, show_venue_details: true, ... });

// AFTER (correct)
setVisibility({ show_bride_details: false, show_groom_details: false, show_venue_details: false, show_parlour_details: false, show_bride_location: false, show_groom_location: false, personal_note: '' });
```

**Change 2 - Lines 158-163**: Change boolean checks from `!== false` to `=== true`:
```tsx
// BEFORE (wrong - treats undefined/null as true)
const showBride = visibility?.show_bride_details !== false;

// AFTER (correct - only shows when explicitly true)
const showBride = visibility?.show_bride_details === true;
```

This applies to all 6 visibility checks (showBride, showBrideLocation, showGroom, showGroomLocation, showVenue, showParlour).

### No changes needed for CrewScheduleClientSheet.tsx

The Client Detail Sheet (opened by tapping client name) is intentionally a quick-reference that shows all contact info regardless of toggle state. The toggles only control the "Full Details" event sheet.

## Files Modified

| File | Change |
|---|---|
| `src/components/crew-schedule/CrewScheduleEventSheet.tsx` | Fix fallback defaults to `false`, fix boolean checks to `=== true` |

