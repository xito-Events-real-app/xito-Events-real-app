

## Booking Calendar Hover Popup with Floating Bubble Effect

### Overview
Add an interactive hover popup to the Booking Calendar in the Booked Clients dashboard. When hovering over a booked date (green circle), a floating popup appears with client names and event details. Clicking a client navigates to their detail page. The popup has a bubble/floating animation effect.

---

### Changes Required

#### File 1: `src/components/booked/DesktopBookedDashboard.tsx`

**Change 1: Enrich calendar data with client details per day**

Currently, the `calendarData` useMemo only stores `eventCount` per day. We need to also store an array of `{ clientName, eventName, registeredDateTimeAD, originalRowNumber }` for each day so the hover popup knows which clients/events are on that date.

Update the data structure from:
```
days: { day, isBooked, eventCount, advancePendingCount }[]
```
to:
```
days: { day, isBooked, eventCount, advancePendingCount, clients: { clientName, eventName, registeredDateTimeAD, originalRowNumber }[] }[]
```

Build a `clientDetailsMap` alongside the existing `bookedMap` that stores client info per date key.

**Change 2: Add hover state management**

Add state for tracking which calendar day is being hovered:
```tsx
const [hoveredCalDay, setHoveredCalDay] = useState<string | null>(null);
```

**Change 3: Add floating popup on each booked day button**

Wrap each booked day button with a relative container and add an absolutely positioned popup that appears on hover. The popup will:
- Show on mouseEnter, hide on mouseLeave
- Display each client name and event name as clickable items
- Navigate to client detail page on click
- Have a floating bubble animation with subtle bounce

**Change 4: Add bubble/floating animation to the popup**

The popup will use a CSS animation for a floating/bubble effect - a gentle up-down float with a scale-in entrance.

#### File 2: `src/index.css`

**Add new keyframes and classes for the floating bubble effect:**

```css
@keyframes calendar-bubble-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-4px); }
}

@keyframes calendar-bubble-enter {
  0% { opacity: 0; transform: scale(0.8) translateY(8px); }
  60% { transform: scale(1.05) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

.calendar-bubble {
  animation: calendar-bubble-enter 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
             calendar-bubble-float 2s ease-in-out 0.3s infinite;
}
```

---

### Popup Design

The popup will appear above the hovered date circle and look like:

```text
+---------------------------+
|  2082 Magh 15             |
|  -------------------------+
|  > Wedding - Ram Sharma   |
|  > Mehendi - Sita Thapa   |
+---------------------------+
        ^  (arrow pointing down to the circle)
```

- Each client row is clickable (navigates to client detail)
- Background: card color with border and shadow
- Arrow/triangle pointing to the circle below
- Floating bubble animation on the entire popup
- z-index: 50 to appear above everything

---

### Technical Notes

- The `calendarData` useMemo needs to iterate `clients` and store per-day client arrays (minor performance cost, acceptable for typical dataset sizes)
- Uses `getClientDetailPath` for navigation (already imported)
- The same enhancement applies to both the Booked Clients calendar; the Client Tracker calendar can be updated separately if needed
- The popup uses `onMouseEnter`/`onMouseLeave` on the day button - no external tooltip library needed
- Popup positioning: absolute, bottom-full, centered horizontally with a small arrow
