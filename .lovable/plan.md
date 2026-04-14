

# Fix: Crew Schedule "Full Details" Shows Only Crew

## Root Cause
In `CrewScheduleEventSheet.tsx` line 152-153, when no `freelancer_event_settings` row is found for the freelancer, all visibility flags are set to `false`:

```typescript
setVisibility({ show_bride_details: false, show_groom_details: false, 
  show_venue_details: false, show_parlour_details: false, 
  show_bride_location: false, show_groom_location: false, personal_note: '' });
```

This hides venue, parlour, bride, and groom sections. Only the crew list shows because it has no visibility gate.

## Fix
One line change in `CrewScheduleEventSheet.tsx` line 153: flip all defaults to `true` when no settings row exists. This matches the existing rule in `AllClientsCrewTable` — "if no freelancer-specific visibility settings exist, all information is shown."

```typescript
setVisibility({ show_bride_details: true, show_groom_details: true, 
  show_venue_details: true, show_parlour_details: true, 
  show_bride_location: true, show_groom_location: true, personal_note: '' });
```

## File to edit
- `src/components/crew-schedule/CrewScheduleEventSheet.tsx` — line 153 only

