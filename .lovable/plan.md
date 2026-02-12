

# Darker Background + Date Group Borders (Multi-Row Dates Only)

## What Changes

### 1. Darker Background
- Change the main container background from `bg-white` to `bg-gray-200`
- Darken the `DAY_COLORS` palette to stronger shades for better contrast

### 2. Date Group Borders -- Only for Dates with 2+ Events
- Compute a count of rows per `eventDay` value
- Only apply border "box" styling when a date has **more than 1 row**
- Single-event dates get no extra border treatment
- For multi-row date groups:
  - First row gets a thick top border + left/right borders with rounded top corners
  - Middle rows get left/right borders
  - Last row gets a thick bottom border + left/right borders with rounded bottom corners
  - Border color matches the day's color group for visual cohesion

### Technical Details

**File: `src/components/suite/AllClientsCrewTable.tsx`**

- Compute a `dayCounts` map: `Map<string, number>` counting how many rows share each `eventDay`
- Update `DAY_COLORS` to darker shades (e.g., `bg-blue-200/80`, `bg-amber-200/70`)
- Change outer container from `bg-white` to `bg-gray-200`
- In desktop `tbody`, for each row check:
  - `dayCounts.get(row.eventDay) > 1` -- if yes, apply group border logic
  - Compute `isFirstInGroup` / `isLastInGroup` by comparing with neighboring rows
  - Apply `border-t-2`, `border-b-2`, `border-l-2`, `border-r-2` with a darker gray/violet color
- In mobile card layout, wrap multi-row date groups in a container div with a visible border

