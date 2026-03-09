

## Video Edit Tracker — Sheet-First Architecture

### Approach
No Supabase table. The Google Sheet tab "BOOKED CLIENTS VIDEO EDIT TRACKER" is the single source of truth. The frontend reads/writes directly via the `google-sheets` edge function, same pattern as Client Tracker and Booked Clients.

### Data Flow

```text
Deliverables (client_deliverables DB table)
        │
        ▼
  "Generate Rows" button scans all booked clients'
  enabled video deliverables (full_video, highlights,
  reel, video_insta_post) and writes new rows to Sheet
        │
        ▼
  Google Sheet: "BOOKED CLIENTS VIDEO EDIT TRACKER"
  Columns A-R (as specified)
        │
        ▼
  UI reads from Sheet via edge function
  UI writes back to Sheet on every change
```

### Sheet Columns (A-R)
A: registered_date_time_ad, B: registered_date_bs, C: client_name, D: event_name, E: event_year, F: event_month, G: event_day, H: event_date_ad, I: video_edit_status, J: urgency, K: priority, L: sub_event_name, M: edit_type, N: editor, O: company_notes, P: client_demand, Q: reference, R: songs

### Implementation Steps

**1. Edge Function: Add video-edit actions to `google-sheets/index.ts`**

New actions in the existing edge function:
- `getVideoEditRows` — Read all rows from "BOOKED CLIENTS VIDEO EDIT TRACKER" sheet, return as typed array
- `updateVideoEditRow` — Update specific columns (I, J, K, L, M, N, O, P, Q, R) for a given row number
- `generateVideoEditRows` — Scan `client_deliverables` table for enabled video types across all booked clients, generate new sheet rows for any missing combinations. Each row = one deliverable item (e.g., "BRIDE MEHNDI - Full Video 1"). Uses `clients_cache` + `event_details_cache` for client metadata
- `pushVideoEditToLab` — Update Column I from "QUEUE" to "LAB" for a specific row

**2. `src/lib/video-edit-api.ts`** — Frontend API layer
- `getVideoEditRows()` — calls `callSheetsFunction("getVideoEditRows")`
- `updateVideoEditField(rowNumber, field, value)` — instant write-back
- `generateVideoEditRows()` — triggers row generation
- `pushToLab(rowNumber)` — status update

**3. `src/hooks/useVideoEditTracker.ts`** — Hook
- Loads all rows on mount via `getVideoEditRows()`
- Splits into `queueRows` / `labRows` by `video_edit_status`
- Computes priority (rank 1..N by `event_date_ad` ascending)
- Provides `updateRow`, `pushToLab`, `generateRows`, `refresh`

**4. `src/pages/VideoEditTracker.tsx`** — Page (mobile/desktop detection)

**5. `src/components/video-edit/DesktopVideoEditTracker.tsx`** — Main UI
- Two tabs: QUEUE / LAB
- Table with columns: S.No, Urgency (heat-map dropdown 1-5), Priority (computed), Client Name, Event Name, Edit Type, Editor (freelancer dropdown, video editors first from `freelancers_cache`), Company Notes (icon + hover tooltip), Demand, Reference, Songs (link icon + notes tooltip), Push to Lab button
- "Generate Rows" button at top to scan deliverables and populate sheet
- Minimalist high-contrast style

**6. `src/components/video-edit/MobileVideoEditTracker.tsx`** — Card layout for mobile

**7. Update `src/lib/suite-modules.ts`** — Change status to `'active'`

**8. Update `src/App.tsx`** — Replace ComingSoon route with VideoEditTracker page

**9. Update `supabase/config.toml`** — No change needed (uses existing `google-sheets` function)

### Row Generation Logic (in edge function)
1. Query `client_deliverables` where `section = 'videos'` AND `enabled = true`
2. For each row, use `quantity` and `item_names` to expand into individual items
3. Sub-event name = `"{Event Name} - {Edit Type} {index}"` (e.g., "Bride Mehndi - Full Video 1")
4. Check existing sheet rows to avoid duplicates (match on registered_date_time_ad + event_name + sub_event_name + edit_type)
5. Pull client metadata from `clients_cache` and `event_details_cache`
6. Append new rows with default status "QUEUE"

### Urgency Heat-Map Colors
- 1: gray/muted
- 2: blue
- 3: yellow/amber
- 4: orange
- 5: red (critical)

### Files Changed
- `supabase/functions/google-sheets/index.ts` — Add 4 new action handlers
- `src/lib/video-edit-api.ts` — New file
- `src/hooks/useVideoEditTracker.ts` — New file
- `src/pages/VideoEditTracker.tsx` — New file
- `src/components/video-edit/DesktopVideoEditTracker.tsx` — New file
- `src/components/video-edit/MobileVideoEditTracker.tsx` — New file
- `src/lib/suite-modules.ts` — Status change
- `src/App.tsx` — Route update

