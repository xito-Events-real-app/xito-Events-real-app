

# Fix Calendar Day Colors for Better Visibility

## Problem
On the dark purple background of the crew schedule, the current colors are too faint:
- **Past non-booked days** (`text-gray-500`): Nearly invisible on the dark background
- **Past booked days** (`opacity-40` + `bg-emerald-500/10`): Almost impossible to see
- **Upcoming days** (`text-emerald-200/60`): Could be slightly brighter

## Solution
Use significantly brighter, higher-contrast colors:

| Day Type | Current | New |
|----------|---------|-----|
| Past (non-booked) | `text-gray-500` | `text-gray-400` (brighter grey) |
| Past (booked) | `bg-emerald-500/10 text-emerald-800/60 opacity-40` | `bg-emerald-500/15 text-emerald-400/50` (no opacity, visible green) |
| Today (non-booked) | `bg-emerald-500/40 text-emerald-200 ring-1 ring-emerald-400` | Keep as-is (looks good) |
| Upcoming (non-booked) | `text-emerald-200/60` | `text-emerald-300/80` (brighter light green) |
| Upcoming (booked) | `bg-emerald-500/30 text-emerald-300` | Keep as-is (looks good) |
| Past booked dot | `bg-emerald-700/50` | `bg-emerald-500/40` (more visible) |

## Technical Details

### File: `src/pages/CrewSchedule.tsx` (lines 382-404)

Update the className conditional and the dot color:
- Line 387: Change past booked from `"bg-emerald-500/10 text-emerald-800/60 opacity-40"` to `"bg-emerald-500/15 text-emerald-400/50"`
- Line 392: Change past non-booked from `"text-gray-500"` to `"text-gray-400"`
- Line 393: Change upcoming non-booked from `"text-emerald-200/60"` to `"text-emerald-300/80"`
- Line 403: Change past booked dot from `"bg-emerald-700/50"` to `"bg-emerald-500/40"`
