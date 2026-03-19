

## Add Lagan (Auspicious Wedding Dates) Feature to All Clients Page

### What are Lagans?
Lagan dates are auspicious Hindu wedding dates that vary by month. You need to store which days in each BS month/year are Lagan dates, display them in the header, and mark them with a Ganesh-style icon in the table's date column.

### Database

**New table: `lagan_dates`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto |
| bs_year | integer | e.g. 2082 |
| bs_month | integer | 1-12 |
| bs_day | integer | day of month |
| created_at | timestamptz | auto |

Unique constraint on `(bs_year, bs_month, bs_day)`. RLS: allow all (public data).

### UI Changes — `src/components/suite/AllClientsCrewTable.tsx`

#### 1. Header: Add Lagan button + display selected dates
- Add a small calendar icon button (e.g. "🕉 Lagan") in the header bar, between the month arrows and the Expand All button
- Clicking it opens a Popover with a simple day-picker grid (1-32 days for the current month) where you can toggle days on/off as Lagan dates — saves to `lagan_dates` table immediately
- Between the month selector and "Expand All" button, show the current month's Lagan dates as small orange/saffron pill badges (e.g. `3, 7, 12, 18, 25`)

#### 2. Table rows: Ganesh icon on Lagan dates
- In the date cell (`<td>` around line 1025), check if `row.eventDay` matches a Lagan date for the current month/year
- If yes, render a small inline SVG Ganesh symbol (a simple stylized "ॐ" or elephant-head silhouette, ~12px) below or beside the day number
- The icon will be saffron/orange colored to stand out

#### 3. Ganesh Icon
Since Lucide doesn't have a Ganesh icon, I'll create a tiny inline SVG component — a simple stylized elephant head silhouette (minimal art style, ~16x16). This keeps it lightweight without external dependencies.

### Files Changed
- **Database migration**: Create `lagan_dates` table
- **New**: `src/components/suite/LaganDatesPicker.tsx` — Popover with day grid for adding/removing Lagan dates
- **New**: `src/components/suite/GaneshIcon.tsx` — Simple SVG elephant head icon
- **Edit**: `src/components/suite/AllClientsCrewTable.tsx` — Load Lagan dates, show pills in header, show Ganesh icon in date cells

### Data Flow
1. On mount (and when year/month changes), query `lagan_dates` for the selected year+month
2. Store in local state as `Set<number>` of days
3. Header shows pills; table rows check membership
4. Popover toggles insert/delete on `lagan_dates` table per day click

