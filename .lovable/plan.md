

## Benzo Keep: 3-Column Layout with Xito Search (Status-Grouped) + Booking Calendar

### Layout (Desktop)

```text
+-------------------------+---------------------+---------------------------+
|     XITO SEARCH         |    BENZO KEEP NOTE  |    BOOKING CALENDAR       |
|                         |                     |                           |
|  MAGH 15 (3 events)    |  Color Picker       |  MAGH 2082 : 1 2 (3) ... |
|                         |                     |  FALGUN 2082 : 1 (2) ... |
|  [BOOKED]               |  +---------------+  |  CHAITRA 2082 : ...       |
|  - Wedding (Client A)  |  | Note Editor   |  |                           |
|                         |  | "Magh 15 -    |  |  [Show Less / View All]   |
|  [BARGAINING IS ON]     |  |  Reception    |  |                           |
|  - Reception (Client B)|  |  Magh 17 -    |  |  Hover popups work here   |
|                         |  |  Wedding"     |  |  with client details      |
|  [QUOTATION SENT]       |  +---------------+  |                           |
|  - Mehendi (Client C)  |                     |                           |
|                         |                     |                           |
|  MAGH 17 (1 event)     |                     |                           |
|  [BOOKED]               |                     |                           |
|  - Wedding (Client D)  |                     |                           |
+-------------------------+---------------------+---------------------------+
```

On **mobile**, the Xito Search section appears collapsed above the note editor (no calendar).

### Status Grouping Order in Xito Search

Within each matched date, events are grouped by client status using color-coded tags, in this priority:

1. **BOOKED** (green tag)
2. **BARGAINING IS ON** (purple tag)
3. **ADVANCE PENDING** (pink tag)
4. **QUOTATION SENT : REVIEW PENDING** (indigo tag)
5. **CALLED : QUOTATION PENDING** (blue tag)
6. All remaining statuses in their canonical order from `STATUS_ORDER` in `status-config.ts`

Each status group gets a colored badge/tag using the existing `getStatusConfig()` colors, so handlers can instantly distinguish booked events from in-progress negotiations.

### What Gets Built

**1. New component: `src/components/shared/XitoSearchPanel.tsx`**

- Accepts `noteContent: string` prop
- Parses text to extract Nepali date references (e.g., "Magh 15", "Falgun 3", "Kartik")
- Uses `useCachedData()` to scan all clients for matching `eventMonth` + `eventDay`
- Groups results first by date, then within each date by status using `normalizeStatus()` and a custom priority sort:
  - BOOKED first, then BARGAINING, ADVANCE PENDING, QUOTATION SENT, QUOTATION PENDING, then rest
- Each status group shows a colored tag using `getStatusConfig(status)` for the background color and label
- Under each tag: list of matching events with event name and client name
- Debounced at 300ms for live-typing performance
- Works in both edit mode (live) and view mode (static)

**2. New component: `src/components/shared/BookingCalendarMini.tsx`**

- Self-contained calendar fetching data via `useCachedData()` and `useBulkEventDetails()`
- Reuses calendar computation logic from `DesktopDashboard.tsx`
- Month rows with green/yellow circles for booked/pending dates
- `CalendarDayPopup` on hover with client details
- Toggle between 4-month and 12-month view
- Read-only reference

**3. Modify `src/components/client-detail/BenzoKeepDialog.tsx`**

- Desktop: `max-w-[90vw]` with 3-column grid
  - Left (w-1/4): `XitoSearchPanel`
  - Center (w-2/4): Note editor
  - Right (w-1/4): `BookingCalendarMini`
- Mobile: single-column with collapsible Xito Search above editor

**4. Modify `src/components/suite/BenzoKeepNotepadDialog.tsx`**

- Same 3-column layout, widened to `max-w-[90vw]`

**5. Modify `src/components/client-detail/BenzoKeepViewer.tsx`**

- Show Xito Search results below note card based on saved content

**6. Modify `src/components/suite/UnassignedBenzoKeepDialog.tsx`**

- Show Xito Search results below note content

### Xito Search Status Priority Logic

```text
const XITO_STATUS_PRIORITY = [
  'BOOKED',
  'BARGAINING IS ON',
  'ADVANCE PENDING',
  'QUOTATION SENT : REVIEW PENDING',
  'CALLED : QUOTATION PENDING',
  // ... remaining statuses follow STATUS_ORDER from status-config.ts
];
```

Each status tag renders as a small colored badge using the existing `getStatusConfig()` utility:
- BOOKED = green badge
- BARGAINING IS ON = purple badge
- ADVANCE PENDING = pink badge
- QUOTATION SENT = indigo badge
- QUOTATION PENDING = blue badge

### Date Matching Logic

| Note Text | Extracted | Matches Against |
|-----------|-----------|-----------------|
| "Magh 15" | month: 10, day: 15 | client.eventMonth contains "10" AND client.eventDay contains "15" |
| "Falgun 3" | month: 11, day: 3 | eventMonth contains "11" AND eventDay contains "3" |
| "Kartik" (no day) | month: 7 | ALL events in Kartik month |

### Files Summary

| File | Action |
|------|--------|
| `src/components/shared/XitoSearchPanel.tsx` | NEW -- date extraction + event matching + status-grouped display |
| `src/components/shared/BookingCalendarMini.tsx` | NEW -- self-contained booking calendar with popups |
| `src/components/client-detail/BenzoKeepDialog.tsx` | 3-column layout on desktop |
| `src/components/suite/BenzoKeepNotepadDialog.tsx` | 3-column layout on desktop |
| `src/components/client-detail/BenzoKeepViewer.tsx` | Add Xito Search below note card |
| `src/components/suite/UnassignedBenzoKeepDialog.tsx` | Add Xito Search below note content |

