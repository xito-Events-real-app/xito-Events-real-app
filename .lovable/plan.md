

# Simplify Event Card -- Remove Dropdown, Keep Only "Full Details"

## What Changes

The event card will become a simple, non-expandable card. Tapping "Full Details" opens the full event detail sheet. No more expand/collapse dropdown.

## Visual Layout

```text
+--------------------------------------------+
| [11 Falgun] -- Reception                   |
|   Client Name                              |
|   [    Full Details    ]                   |
+--------------------------------------------+
```

## Technical Changes

### `src/components/crew-schedule/EventDetailCard.tsx`

- Remove the `Collapsible`, `CollapsibleTrigger`, and `CollapsibleContent` wrappers entirely
- Remove the chevron up/down icons
- Remove the expanded state and all the inline detail sections (CrewSection, ContactSection, VenueSection)
- Keep the card as a simple static div showing: date, event name, client name badge
- Make the "Full Details" button larger -- full-width, taller padding, bigger text (text-xs, py-1.5, rounded-lg)
- The "Full Details" button opens the `CrewScheduleEventSheet` (same as now)
- The client name badge still opens `CrewScheduleClientSheet` (same as now)
- Remove imports for `ChevronDown`, `ChevronUp`, `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger`, `Loader2`
- Remove the helper components that are no longer used inline: `DetailRow`, `ContactSection`, `VenueSection`, `CrewSection` (these are only used in the dropdown which is being removed)

### Files Modified
- `src/components/crew-schedule/EventDetailCard.tsx` -- simplify to static card with large "Full Details" button only

