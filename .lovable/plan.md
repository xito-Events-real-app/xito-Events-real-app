

# Redesign Files Section: Month Filters + Expandable Client Accordions (Past/Today Events Only)

## Key Constraint
Only show files for events where `event_date_ad <= today` (past and today). No future events.

## Data Flow

```text
freelancer_assignments (event_date_ad ≤ today)
  → group by event_year-event_month → month tabs
  → group by client_name → expandable accordions
  → auto-ensure file rows exist in files_management (idempotent)
```

## UI Structure

```text
┌─────────────────────────────────────────────────┐
│ Month Tabs (like Finance sidebar)               │
│ [Falgun 2082] [Magh 2082] [Poush 2082] ...     │
│                              [See More ▼]       │
├─────────────────────────────────────────────────┤
│ ▶ URUSHA GHIMIREY       1 event · 4 files       │
│ ▶ PRAMILA BHUSAL        2 events · 8 files      │
│ ▼ ASHMI KC              2 events · 6 files       │
│   ┌─────────────────────────────────────────┐   │
│   │ BRIDE HALDI MEHNDI (12 Falgun)          │   │
│   │ [Crew][Freelancer][Side][Card][Size]... │   │
│   │ PB   Ram       BRIDE  CF1   32GB       │   │
│   ├─────────────────────────────────────────┤   │
│   │ WEDDING(BOTH SIDES) (14 Falgun)         │   │
│   │ PB   Ram       BRIDE  CF1   64GB       │   │
│   └─────────────────────────────────────────┘   │
│ ▶ SEWAK KHADKA          3 events · 12 files     │
└─────────────────────────────────────────────────┘
```

## Technical Changes

### 1. `src/lib/files-api.ts` — Two new functions

**`getAvailableFileMonths()`**: Query `freelancer_assignments` for distinct `event_year + event_month` where `event_date_ad <= today`. Return sorted (most recent first), with labels like "Falgun 2082".

**`ensureFileRowsForMonth(eventYear, eventMonth)`**: 
- Query all assignments for that month where `event_date_ad <= today` and at least one crew member is assigned
- Check which combos (`registered_date_time_ad + event + freelancer field`) already have rows in `files_management`
- Insert only missing rows (idempotent — safe to call repeatedly)
- Uses the same `CREW_CODE_MAP` logic as existing `autoGenerateFileRows`

### 2. `src/hooks/useFilesManagement.ts` — Refactor for month-based loading

- Accept `selectedMonth: { year: string; month: string } | null` instead of client-name filter
- On mount: call `getAvailableFileMonths()` to populate month tabs, default to current/most recent month
- On month change: call `ensureFileRowsForMonth()` in background, then load file records filtered by that month
- Remove `generateRows` from return (no longer manual)
- Add `availableMonths` to return value

### 3. `src/components/files/FilesManagementTable.tsx` — Full UI redesign

**Remove**: Client search bar, "Auto-Generate Rows" button

**Add**:
- **Month tab bar** at top: current month first, 5 older months, "See More" toggle for rest. Uses same visual style as Finance sidebar month tabs but horizontal
- **Client accordions**: Group files by `client_name`, each as a Collapsible
  - Header: client name, event count badge, file count badge
  - Expanded: sub-grouped by `event_name` with event date shown
  - Each event group shows the existing inline-editable table (side, card, size, format, checkboxes, file path)
- All existing inline editing stays intact

### 4. `src/components/files/FileManagementSidebar.tsx` — Add month filter

Add a "Filter by Month" section (same pattern as `DesktopFinanceSidebar`) showing available months as vertical buttons, synced with the table's month selection.

### 5. `src/pages/FileManagement.tsx` — Wire month state

Lift `selectedMonth` and `availableMonths` state to page level so both sidebar and table share it.

## Files Changed
1. `src/lib/files-api.ts` — add `getAvailableFileMonths`, `ensureFileRowsForMonth`
2. `src/hooks/useFilesManagement.ts` — month-based loading, auto-ensure
3. `src/components/files/FilesManagementTable.tsx` — month tabs + client accordions
4. `src/components/files/FileManagementSidebar.tsx` — month filter section
5. `src/pages/FileManagement.tsx` — wire shared month state

## Safety
- `ensureFileRowsForMonth` is idempotent — checks existing rows before inserting
- Existing 48 file records remain untouched
- Only past/today events shown (future excluded via `event_date_ad <= today`)
- Sheet sync unchanged — new rows get `synced_to_sheet: false` and trigger push scheduler

