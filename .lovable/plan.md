

# Improve Calendar Day Visibility on Crew Schedule

## Problem
Non-booked dates on the freelancer's crew schedule calendar use `text-white/40` (very faint white), making them hard to read. Today's date blends in with a violet tint, and there's no visual distinction for upcoming dates.

## Changes

### File: `src/pages/CrewSchedule.tsx` (lines 382-393)

Update the calendar day color logic for **non-booked** days:

| Day Type | Current Style | New Style |
|----------|--------------|-----------|
| Past (non-booked) | `text-white/40` + `opacity-40` | `text-gray-500` (readable grey) |
| Today (non-booked) | `bg-violet-500/30 text-violet-200` | `bg-emerald-500/40 text-emerald-200 ring-1 ring-emerald-400` (green highlight) |
| Upcoming (non-booked) | `text-white/40` | `text-emerald-200/60` (soft light green) |

For **booked** days, the existing emerald styling stays the same -- only the empty/non-booked day colors change.

This keeps the overall dark theme palette consistent while making every date clearly readable.

