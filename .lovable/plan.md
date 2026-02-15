
# Freelancer Schedule -- Tabbed Layout + Compact Header

## Overview
Restructure the CrewSchedule page so that:
1. The top section (greeting, name, today's date, stats) is compressed into a compact 2-row header
2. A bottom tab bar switches between "Booking Calendar" and "Upcoming Events"
3. The Booking Calendar tab defaults to showing today's/next upcoming events when no date is selected

## Layout Structure

```text
Row 1: "Good Morning, Barun Koirala"  |  11 Falgun 2082 / Feb 15, 2026
Row 2: [12 This Month] [8 Remaining] [24 Total Upcoming]
-------------------------------------------------------------
TAB CONTENT (scrollable area, takes remaining height)
-------------------------------------------------------------
[ Booking Calendar ]  [ Upcoming Events ]   <-- Fixed bottom tab bar
```

## Detailed Changes

### 1. Compact Header (2 rows max)

**Row 1**: Single line combining greeting + name + today's date
- Left side: "Good Morning, Barun Koirala" (small text)
- Right side: "11 Falgun 2082 | Feb 15, 2026" as a small pill

**Row 2**: Stats as a single compact row of 3 inline badges
- `12 This Month | 8 Remaining | 24 Upcoming` -- small inline pills, not tall cards

This replaces the current 4 separate sections (greeting block, TodayDateHeader component, stats grid).

### 2. Bottom Tab Bar
- Fixed at the bottom of the page (or at the bottom of the container in popup mode)
- Two tabs side by side: "Booking Calendar" (with calendar icon) and "Upcoming Events" (with list icon)
- Active tab: `bg-white/20 text-white font-bold`
- Inactive tab: `text-white/50`
- State: `activeTab: "calendar" | "upcoming"`

### 3. Booking Calendar Tab (default)
- Shows the calendar grid with month navigation (as-is)
- Below the calendar:
  - If no date selected: show today's events, or if none today, show the next closest upcoming event with a "Next Event" label
  - If a date is clicked: show that day's events (as currently)
- Remove the old UpcomingEventsSection from this tab

### 4. Upcoming Events Tab
- Shows the full UpcomingEventsSection (moved here from below the calendar)
- Everything else stays the same

## Technical Changes

### `src/pages/CrewSchedule.tsx`
- Add `activeTab` state: `"calendar" | "upcoming"`, default `"calendar"`
- Compress the greeting + TodayDateHeader + stats into 2 compact rows
- Remove standalone TodayDateHeader component usage (inline the date info)
- Wrap calendar and upcoming in tab content areas
- Add a fixed bottom tab bar
- Add logic for "default events" -- compute today's events or next upcoming event to show when no date is selected on the calendar tab
- Use `flex flex-col h-full` layout so the tab bar stays at the bottom and content scrolls

### `src/components/crew-schedule/UpcomingEventsSection.tsx`
- No changes needed (just moved to the other tab)

### `src/components/crew-schedule/EventDetailCard.tsx`
- No changes needed

### Files Modified
- `src/pages/CrewSchedule.tsx` -- major layout restructure
