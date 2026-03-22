

## Fix File Tracking Table — Visibility, Scrolling, Filters & Row Differentiation

### Problems Identified
1. Client name truncated at `max-w-[120px]`, Event at `max-w-[100px]` — text not readable
2. `ScrollArea` has `max-h-[500px]` but table rows scroll the whole page instead of independently
3. Date column shows year (e.g. "Falgun 10, 2082") — year wastes space, remove it → just "Falgun 10"
4. No visual distinction between photo and video file rows
5. Only client name is clickable — user wants ALL columns clickable as filters (event, freelancer, role, storage, etc.) EXCEPT client name which navigates to client page

### Changes — `src/components/files/FilesDashboard.tsx`

**1. Remove truncation from Client and Event columns**
- Remove `max-w-[120px]` from client cell, `max-w-[100px]` from event cell
- Use `whitespace-nowrap` instead of `truncate` — let table be wider and scroll horizontally
- Also remove `max-w-[90px]` from freelancer and `max-w-[80px]` from storage

**2. Fix table scrolling — independent scroll container**
- Wrap the table in a `div` with `overflow-y-auto max-h-[500px]` with sticky header
- Add `sticky top-0 z-10 bg-[hsl(220,25%,10%)]` to `TableHeader` so headers stay visible while scrolling
- This ensures table scrolls independently without moving the page

**3. Date column — remove year**
- Change from `"Falgun 10, 2082"` → `"Falgun 10"`
- Just `${monthName} ${day}` without the year portion

**4. Photo/Video row differentiation**
- Add a thin colored left border to each row based on `freelancer_type`:
  - Photo types (PB, PG, etc.): left border `border-l-2 border-l-blue-500/40`
  - Video types (VB, VG, etc.): left border `border-l-2 border-l-purple-500/40`
  - Other: no left border
- This gives instant visual grouping without changing layout

**5. Make columns clickable as filters (except Client Name)**
- **Event**: clicking toggles a filter to show only that event name
- **Freelancer**: clicking filters to that freelancer
- **Role**: clicking filters to that role type
- **Storage**: clicking filters to that device name
- Add filter state: `clickFilterEvent`, `clickFilterFreelancer`, `clickFilterRole`, `clickFilterDevice`
- Show active filters as dismissible badges in the sub-filter bar
- Client name keeps its existing navigate-to-client behavior (no filter)
- All clickable cells get `hover:underline cursor-pointer` styling with a subtle color shift

### Single file changed
- `src/components/files/FilesDashboard.tsx`

