
# Date Display Fixes for Upcoming Events

## What Changes

### 1. Today's Date Pill - Right Side of "Upcoming Events" Title
Keep the date pill next to "Upcoming Events" but style it exactly like the Sync button:
- Use `bg-gradient-to-r from-orange-500 via-red-500 to-purple-600` gradient (same as Sync)
- Same shadow: `shadow-md shadow-orange-500/25`
- Same sizing: `h-9 rounded-full font-semibold`
- Same hover effects: `hover:shadow-lg hover:scale-[1.02]`
- Calendar icon + "Falgun 1 / Feb 13" text
- No year

### 2. Event Card Date - Inline Pill Next to Client Name
On each event card, move the date from a 3rd line below the event name to an **inline pill next to the client name** on the same row:
- Remove the separate date paragraph (lines 470-486)
- Add a small gradient pill (same orange-red-purple style) after the client name
- Format: "Falgun 1 / Feb 13" (no year, no comma)
- The client name and date pill sit on the same flex row

### 3. Both Desktop and Mobile
All changes apply to both viewports since this component renders for both.

## Technical Details

### File: `src/components/suite/TodayEventsHero.tsx`

**Header date pill (lines 342-356):** Change gradient from `from-emerald-500 via-teal-500 to-cyan-600` to `from-orange-500 via-red-500 to-purple-600` with matching shadow. Keep Calendar icon and date text.

**Event card layout (lines 460-487):**
- Change client name line to a flex row with the client name on the left and a small gradient date pill on the right
- Remove the 3rd line date paragraph (lines 470-486)
- Date pill format: `Falgun 1 / Feb 13` (no year)
- Small pill style matching the header pill but smaller (text-[10px])

| Change | Location |
|--------|----------|
| Restyle header date pill to match Sync button gradient | Lines 342-356 |
| Move event date inline with client name as pill, remove year | Lines 460-487 |
