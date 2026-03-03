

# Full-Screen Files Table (All Clients Style) — Reverse Day Order

## Overview
Create a new `FullScreenFilesTable` component that mirrors the `AllClientsCrewTable` structure but for file management. When "Files" is clicked (sidebar or tab), it opens as a **full-screen overlay** (`fixed inset-0 z-[100]`). Days are sorted in **descending order** (25, 24, 23...). All rows are muted/past style. Expanding a row shows the file management table (crew, freelancer, side, card, size, format, copied, checkboxes, path).

## Key Differences from AllClientsCrewTable

| Aspect | All Clients | Files |
|--------|------------|-------|
| Header gradient | Violet/purple | Cyan/blue |
| Main columns | Day, Client, Event + 10 crew assignment columns | Day, Client, Event (no crew columns in main row) |
| Row style | Upcoming + Completed split | All muted (past only), sorted day DESC |
| Expand content | EventLogisticsPanel (venue/parlour/contact) | File rows table (inline editable) |
| Data source | `freelancer_assignments` cache | `freelancer_assignments` + `files_management` via `useFilesManagement` |

## New File: `src/components/files/FullScreenFilesTable.tsx`

### Header Bar (cyan gradient)
- Back button (← closes overlay)
- Icon + "FILE MANAGEMENT" title
- Year selector + Month selector (same pattern as AllClientsCrewTable)
- Stats: `X events · Y files · Z GB`
- Expand All / Collapse All button
- Close (X) button

### Data Loading
- Query `freelancer_assignments` filtered by selected year+month where `event_date_ad <= today`
- Sort by `eventDay` **descending** (25 → 24 → 23...)
- Use `useFilesManagement` for file CRUD operations on the selected month
- Call `ensureFileRowsForMonth` on month change (background)

### Row Structure (Day | Client | Event)
- **Day column**: Day number in rounded circle (cyan instead of violet), clickable to filter by day
- **Client column**: Client name, clickable to filter by client
- **Event column**: Event name
- All rows rendered in muted/italic style (past events)
- Day grouping with alternating `DAY_COLORS` — same as AllClientsCrewTable
- Expand/collapse chevron per row

### Expanded Content (replaces EventLogisticsPanel)
- Shows file rows table for that specific `registered_date_time_ad + event_name` combo
- Table columns: Crew | Freelancer | Side | Card | Size | Format | Copied | ✓ | 2x | 3x | ☁ | Path
- All inline-editable (same as current `FilesManagementTable`)
- Path column opens `FilePathBuilderDialog`

### Mobile Layout
- Card-based layout (same structure as AllClientsCrewTable mobile)
- Day circle + Client name + Event name
- Expand shows file rows in a compact format

### Filter Bar
- Day filter + Client filter (same UX as AllClientsCrewTable)
- Clear filter chips

## Changes to Existing Files

### `src/pages/FileManagement.tsx`
- When `activeSection === "files"`, render `<FullScreenFilesTable onClose={() => setActiveSection("dashboard")} />` instead of `<FilesManagementTable>`
- Remove `FilesManagementTable` import (no longer needed inline)

### `src/components/files/FileManagementSidebar.tsx`
- No structural changes needed — clicking "Files" section triggers the full-screen overlay via the page

## Files
1. **`src/components/files/FullScreenFilesTable.tsx`** — NEW, ~800 lines, full-screen overlay
2. **`src/pages/FileManagement.tsx`** — Wire Files section to open FullScreenFilesTable
3. `src/components/files/FilesManagementTable.tsx` — Kept as-is (reusable inline table logic extracted)

