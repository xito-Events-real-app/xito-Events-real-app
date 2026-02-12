
# Fix Crew Table: Dynamic Columns, Client Navigation & Freelancer Hover

## 3 Bugs Found + 1 Enhancement

### Bug 1: Client Page Not Opening (CRITICAL)
The navigation uses `/client/...` but the actual route is `/client-tracker/client/...`. This causes a 404 error (confirmed in console logs: `404 Error: User attempted to access non-existent route: /client/2026-01-25T13%3A03%3A16.732Z`).

**Fix**: Change all `navigate('/client/...')` to `navigate('/client-tracker/client/...')` in AllClientsCrewTable.tsx (appears on lines 308, 418 for desktop and mobile).

### Bug 2: Freelancer Hover Not Working (CRITICAL)
The `HoverCardTrigger asChild` wraps a `Popover` component, but `Popover` is a Radix compound component that does NOT forward refs. This causes the React warning: "Function components cannot be given refs." The HoverCard never displays because it can't attach to its trigger.

**Fix**: Restructure so the HoverCard wraps a simple `<div>` or `<span>` element instead of nesting inside the Popover. Separate the hover card from the popover -- use a `<div>` wrapper with the HoverCard around just the name display, and keep the Popover separate for the dropdown.

### Bug 3: Font size shrinking prematurely
Currently using hardcoded character thresholds (18/20 chars) to shrink text. User wants text to only shrink if it doesn't fit, not based on arbitrary lengths.

**Fix**: Use CSS `text-overflow: ellipsis` with `overflow: hidden` by default, and only reduce font if ALL columns are already expanded and still overflowing.

### Enhancement: Dynamic Column Widths
Currently all "wide" columns are fixed at `min-w-[120px]`. User wants columns sized to fit the maximum first name length of assigned freelancers, expanding where needed and only shrinking text as a last resort.

**Fix**: Compute the max first-name length per column from the filtered data, then set column widths proportionally. Use a `useMemo` to calculate optimal widths based on actual content.

## Technical Details

### File: `src/components/suite/AllClientsCrewTable.tsx`

**1. Fix client navigation (lines 308, 418)**
Change `navigate('/client/...')` to `navigate('/client-tracker/client/...')` in both mobile and desktop views.

**2. Fix freelancer hover (lines 570-639)**
Restructure `CrewCell` to separate HoverCard from Popover:
- Wrap the cell content in a `<div>` with `position: relative`
- The name button triggers the Popover on click
- The HoverCard wraps just the visible name text, separate from the Popover structure
- This avoids the ref-forwarding issue that breaks the hover

**3. Dynamic column widths**
Add a `useMemo` that:
- For each CREW_COLUMN, finds the maximum first-name length among all filtered rows
- Converts character count to approximate pixel width (roughly 8px per character + 16px padding)
- Sets a minimum of 55px (for empty columns) and maximum of 130px
- Passes the computed width to each column header `<th>` and `CrewCell` `<td>`

**4. Smart text sizing**
- Remove the hardcoded character-count font size logic
- Use CSS `truncate` (already applied in most places) as the primary overflow strategy
- Only apply smaller font when the computed column width is at minimum and the name still overflows

| Change | Description |
|--------|-------------|
| Client nav fix | `/client/` to `/client-tracker/client/` (2 locations) |
| Hover fix | Restructure HoverCard/Popover nesting to avoid ref conflict |
| Dynamic widths | Compute column widths from max first-name length per column |
| Smart text | Remove hardcoded font shrinking, rely on truncation first |
