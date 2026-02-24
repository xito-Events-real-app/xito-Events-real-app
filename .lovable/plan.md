

# Add "View Full Details" Button to Welcome Popup

## Problem
Freelancers see the welcome popup but have no way to jump directly to the full event details sheet from it. They have to dismiss the popup, find the day on the calendar, and tap "Full Details" manually.

## Solution
Add a large, flashing "View Full Details" button to each event card in the welcome popup. Tapping it dismisses the popup and immediately opens the `CrewScheduleEventSheet` for that specific assignment.

## Changes

### 1. Update `CrewWelcomePopup.tsx`

- Add a new prop: `onViewFullDetails: (assignment: AssignmentRow) => void`
- Pass it through to `EventPosterCard`
- In `EventPosterCard`, add a large button at the bottom of each card:
  - Text: "View Full Details" with an arrow icon
  - Styling: full-width, tall (py-4), bold white text on a bright gradient background
  - A new CSS animation `crew-button-flash` that creates a visible on-off glow/pulse effect on the button (alternating opacity and shadow intensity)
- On click: call `onViewFullDetails(assignment)` which will dismiss the popup and open the sheet

### 2. Add flashing button animation in `src/index.css`

```css
@keyframes crew-button-flash {
  0%, 100% { box-shadow: 0 0 8px rgba(255,255,255,0.2); opacity: 0.9; }
  50% { box-shadow: 0 0 25px rgba(255,255,255,0.7), 0 0 50px rgba(168,85,247,0.4); opacity: 1; }
}
```

### 3. Update `CrewSchedule.tsx`

- Add state: `welcomeDetailAssignment: AssignmentRow | null` and `welcomeSheetOpen: boolean`
- Pass `onViewFullDetails` callback to `CrewWelcomePopup` that:
  1. Sets the selected assignment in state
  2. Triggers popup dismiss (sets localStorage timestamp, hides popup)
  3. Opens the `CrewScheduleEventSheet`
- Render a `CrewScheduleEventSheet` at the page level, driven by `welcomeDetailAssignment` state
- The sheet receives the assignment plus any cached event/contact details

### Button Design
- Large size: `w-full py-4 text-base font-black uppercase tracking-wider`
- Gradient: `bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500` (warm colors matching both today/tomorrow themes)
- Flashing animation: `animate-[crew-button-flash_1.5s_ease-in-out_infinite]`
- Rounded corners with ring: `rounded-xl ring-2 ring-white/30`
- Icon: `ExternalLink` or `ChevronRight` from lucide-react

