

# Floating Booking Calendar Popup (BB Shortcut)

## What It Does

Press **B** twice quickly (like the space-space shortcut for search) to open a floating, draggable, resizable Booking Calendar popup. It stays on top of everything but does NOT block interaction with the background -- like a picture-in-picture window. Press **BB** again or click the X button to close it.

## Architecture (3 new files + 1 edit)

### File 1: `src/contexts/BookingCalendarPopupContext.tsx` (NEW)

A context provider following the exact same pattern as `SaugatSearchContext`:
- Double-B keypress detection (400ms window between presses)
- Skips when focus is in input/textarea/contenteditable
- Exposes `isOpen`, `open`, `close`, `toggle`
- Escape key also closes it

### File 2: `src/components/shared/FloatingBookingCalendar.tsx` (NEW)

A floating popup component that:
- Renders when `isOpen` is true from the context
- Uses a portal (renders at document body level) so it floats above everything
- **Draggable**: mousedown on the header bar lets you drag it anywhere
- **Resizable**: a drag handle in the bottom-right corner for resizing (min 320x300, max 800x700)
- **Non-modal**: no overlay, no blocking -- you can click and work on background content
- Has a close (X) button in the header
- Contains the existing `BookingCalendarMini` component inside a scrollable area
- Default position: bottom-right of the screen
- Default size: 380x450px
- z-index: 250 (above sheets at 200, below selects at 300)

### File 3: No third file needed -- the component is self-contained

### File 4: `src/App.tsx` (EDIT)

- Import and wrap with `BookingCalendarPopupProvider` (alongside existing `SaugatSearchProvider`)
- Render `<FloatingBookingCalendar />` alongside `<SaugatSearch />`

## UI Layout of the Popup

```text
+--[ Booking Calendar ]--------[X]--+
|  (draggable header bar)           |
+-----------------------------------+
|                                   |
|   BookingCalendarMini content     |
|   (scrollable)                    |
|                                   |
|                                   |
+-------------------------------[//]+
        (resize handle)
```

## Technical Details

- Drag implementation: native `mousedown`/`mousemove`/`mouseup` events on the header, updating `top`/`left` CSS via state
- Resize implementation: same mouse events on the corner handle, updating `width`/`height` via state
- Position persisted in component state only (resets on page reload -- keeps it simple)
- The popup uses `position: fixed` so it stays in place during scroll

## What Does NOT Change

- `BookingCalendarMini` component stays exactly the same
- `SaugatSearchContext` (double-space) is untouched
- No database or backend changes
