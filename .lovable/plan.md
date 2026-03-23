

## Add Filter Bar + Client/EditType Filters to Video Edit Tracker

### Overview

Add a new filter bar below the pipeline tabs with:
1. **Edit Type filter** — click any edit type badge in the table to filter by that type across current tab
2. **Client Name filter** — click any client name to show only that client's rows, plus a cross-pipeline summary bar showing how many items are in each stage
3. **Month/Year filter** — BS month and year selectors (like All Clients pattern)
4. **"All" tab** — new tab showing all rows across all stages when a filter is active
5. Priority numbers stay based on the full unfiltered dataset

### Changes

**1. `src/components/video-edit/DesktopVideoEditTracker.tsx`**

Add filter state:
- `filterEditType: string | null` — set when clicking an edit type badge
- `filterClient: string | null` — set when clicking a client name
- `filterYear: number | null`, `filterMonth: number | null` — BS month/year selectors

Add a **filter bar** between the pipeline tabs and the table:
- Shows active filters as dismissible pills (edit type, client name, month/year)
- When client is filtered: show a summary row like "Queue: 2 · Edit Lab: 1 · Finalized: 3" across all stages for that client
- Month/Year selects using `nepaliMonthsEnglish` and `getBSYearsRange` (same pattern as `NepaliDateFilter`)
- "Clear All" button

Make edit type badges and client names **clickable** — clicking sets the filter.

Apply filters to the rows passed to `VideoEditTable` — but priority numbers come from `rowsByStatus` (unfiltered), so they don't change.

When any filter is active, add an "All" pseudo-tab that shows filtered rows from every stage combined.

**2. `src/components/video-edit/MobileVideoEditTracker.tsx`**

Same filter bar adapted for mobile layout — compact pills and selects.

**3. `src/hooks/useVideoEditTracker.ts`**

Export raw `rows` array so the desktop component can compute cross-pipeline stats for client filter (count per stage for the selected client). No other hook changes needed — filtering is purely UI-level in the component.

### Filter bar layout (below tabs, above table)
```text
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Client: Shakti Neupane ✕  │  Type: Full Video ✕  │      │
│ Year: [2082 ▾]  Month: [Falgun ▾]  │  Clear All            │
├─────────────────────────────────────────────────────────────┤
│ Pipeline: Queue 2 · Edit Lab 1 · Color 0 · Finalized 3     │
└─────────────────────────────────────────────────────────────┘
```

### Files changed
1. `src/hooks/useVideoEditTracker.ts` — export `allRows` for cross-pipeline stats
2. `src/components/video-edit/DesktopVideoEditTracker.tsx` — filter state, filter bar, clickable cells, filtered display
3. `src/components/video-edit/MobileVideoEditTracker.tsx` — same filter logic for mobile

