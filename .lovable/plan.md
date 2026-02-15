

# Event Detail Card -- "Full Details" Button + Mobile Sheet Fix

## Changes

### 1. Add "Full Details" button next to event name (`EventDetailCard.tsx`)

Currently, tapping the event name itself opens the event detail sheet. Instead:
- The event name will be plain text (no longer a button that opens the sheet)
- Add a small "Full Details" pill/button next to the event name that opens the event detail sheet
- This keeps the interaction clear -- tapping the card expands/collapses the dropdown, tapping "Full Details" opens the full sheet

**Visual layout of the collapsed card:**
```text
[11 Falgun] -- Reception  [Full Details]    [v]
  Client Name Badge
```

The "Full Details" button will be a small violet pill with `e.stopPropagation()` to avoid toggling the dropdown.

### 2. Fix mobile clipping and lag on Event Detail Sheet (`CrewScheduleEventSheet.tsx`)

Current issues:
- `h-[92vh]` combined with `overflow-hidden` on SheetContent clips the top section on some mobile browsers (address bar takes space)
- The scrollable area uses `h-full` which can conflict with the fixed header

Fixes:
- Change `h-[92vh]` to `h-[95dvh]` (using `dvh` -- dynamic viewport height -- which accounts for mobile browser chrome)
- Remove `overflow-hidden` from SheetContent (the inner scroll area handles overflow)
- Change the scroll area from `h-full` to `flex-1 overflow-y-auto` using a flex column layout so it properly fills remaining space after the header
- Reduce `pb-20` to `pb-10` to avoid excessive bottom padding
- Use `will-change-transform` on the sheet content to hint the browser for smoother animations

## Technical Details

### `src/components/crew-schedule/EventDetailCard.tsx`
- Remove the `button` wrapper around `{assignment.event}` (lines 164-173)
- Replace with plain `span` for the event name
- Add a new "Full Details" pill button after the event name that sets `eventSheetOpen(true)`
- Keep the `e.stopPropagation()` on the new button
- Keep all other behavior (client name opens client sheet, dropdown still works)

### `src/components/crew-schedule/CrewScheduleEventSheet.tsx`
- Line 124: Change `h-[92vh]` to `h-[95dvh]`
- Line 124: Remove `overflow-hidden`, add `flex flex-col`
- Line 141: Change `overflow-y-auto h-full pb-20` to `flex-1 overflow-y-auto pb-10`
- Add `will-change-transform` to the SheetContent for smoother open/close

### Files Modified
- `src/components/crew-schedule/EventDetailCard.tsx`
- `src/components/crew-schedule/CrewScheduleEventSheet.tsx`
