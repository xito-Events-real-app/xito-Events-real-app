

## Live Running Timer + Stage Transition History

### Summary
1. Show a **live running timer** on cards for stages Edit on Progress → Re-Edit on Progress, showing `2D 3H 22:23` with seconds ticking in real-time. Color turns red after 2 days.
2. In **Classic View**, show abbreviated `2d 3h` with hover showing live time.
3. In **Finalized** section, show total time (stopped) with option to see timing history.
4. Store **stage transition timestamps** in a new DB column for history tracking.
5. Auto-seed `edit_started_at` with random values (up to 1d 12h ago) for rows currently in Edit on Progress through Re-Edit on Progress that don't have it set.
6. No timer for Queue or Edit Lab stages.

### Database Changes

**Migration 1**: Add `stage_history` column (text, default `''`) to `video_edit_tracker` — stores stage transitions as newline-delimited log entries like `EDIT_ON_PROGRESS [2026-03-25T10:30:00Z]\nCOLOR_QUEUE [2026-03-25T12:00:00Z]`.

**Data update**: Set random `edit_started_at` for rows in EDIT_ON_PROGRESS, COLOR_ON_PROGRESS, RE_EDIT_ON_PROGRESS, COLOR_QUEUE, COLOR_LAB, EXPORT_QUEUE, EXPORTED, CLIENT_REVIEW that currently have null `edit_started_at`. Random values between now minus 0–36 hours.

### Files Changed

**1. `src/lib/video-edit-api.ts`**
- Add `stageHistory: string` to `VideoEditRow` interface and `dbToRow` mapper.
- In `pushToStatus`: append new entry to `stage_history` column: `"STAGE_KEY [ISO_TIMESTAMP]"`.

**2. `src/hooks/useVideoEditTracker.ts`**
- `DisplayRow` inherits `stageHistory` automatically.

**3. `src/components/video-edit/DesktopVideoEditTracker.tsx`**

**New component `LiveEditTimer`**:
- Props: `editStartedAt: string`, `size: 'card' | 'table'`
- Uses `useState` + `useEffect` with 1-second `setInterval` to tick
- Computes days, hours, minutes, seconds from `editStartedAt` to now
- Card size: renders `2D 3H 22:23` in big bold text (text-base font-black)
- Table size: renders `2d 3h` only, with `Tooltip` on hover showing full `2D 3H 22:23` live
- Color: green/normal if < 2 days, **red** if >= 2 days
- For FINALIZED: no ticking, compute total time from `editStartedAt` to last transition timestamp in `stageHistory`

**Dashboard cards** (`renderOngoingCard`):
- Replace the `getTimeAgo` + "Started X ago" with the `LiveEditTimer` component (card size)
- Shows prominently below event age stamp

**Classic View table** (`VideoEditTable`):
- Replace the static `getTimeAgo` Edit Started cell with `LiveEditTimer` (table size)
- Only render for progress stages (EDIT_ON_PROGRESS through FINALIZED), show `-` for QUEUE/EDIT_LAB

**Finalized rows** in Classic View:
- Show stopped total time
- Add a small "History" button that opens a Dialog showing all stage transitions with timestamps and durations between each stage

**New component `StageHistoryDialog`**:
- Props: `stageHistory: string`, `editStartedAt: string`
- Parses the newline-delimited log
- Shows timeline: each stage entry with timestamp, and duration spent in each stage
- Example: `EDIT_ON_PROGRESS → 2d 3h → COLOR_QUEUE → 1h 30m → ...`

**4. `src/components/video-edit/WtnPipelineView.tsx`**
- Show `LiveEditTimer` on pipeline cards for progress stages

### Timer Display Format
```text
Cards (big):     2D 3H 22:23     (seconds ticking live)
Table (compact): 2d 3h           (hover shows 2D 3H 22:23 live)
Finalized:       Total: 5D 12H   (stopped, with History button)
```

### Color Rules
- < 2 days: green text (`text-green-600`)
- >= 2 days: red text (`text-red-600`) with subtle pulse

