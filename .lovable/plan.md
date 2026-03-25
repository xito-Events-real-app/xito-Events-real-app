

## Event Age, Edit Started, and Deadline System

### Summary
Add three key data points to each video edit row: **event age** (how old the event is), **edit started** (when row entered a progress stage), and **deadline** (user-set target with calendar+time picker). Show these on dashboard cards, classic view columns, and a new "Deadlines" section on the dashboard home.

### Database Migration
Add two columns to `video_edit_tracker`:
- `edit_started_at` (timestamptz, nullable) — auto-set when row first moves to EDIT_ON_PROGRESS
- `deadline` (timestamptz, nullable) — user-set deadline with date+time

### Files Changed

**1. `src/lib/video-edit-api.ts`**
- Add `editStartedAt: string` and `deadline: string` to `VideoEditRow` interface
- Map in `dbToRow`: `editStartedAt: r.edit_started_at || ""`, `deadline: r.deadline || ""`
- Add `deadline` to `fieldMap` in `updateVideoEditField`
- In `pushToStatus`: when `newStatus` is `EDIT_ON_PROGRESS`, also set `edit_started_at = now()` if not already set

**2. `src/hooks/useVideoEditTracker.ts`**
- `DisplayRow` inherits new fields automatically
- Add `updateDeadline(id, deadline, mergedIds?)` function

**3. `src/components/video-edit/DesktopVideoEditTracker.tsx`**

**Helper functions** (top of file):
- `getEventAge(eventDateAD)` → returns `{ days: number, bsDisplay: string }` e.g. "Magh 24, 2082 · 32 days old"
- `getEditStartedAgo(editStartedAt)` → returns "12 days 5 hrs ago"
- `getDeadlineRemaining(deadline)` → returns `{ text: string, isCrossed: boolean, isClose: boolean }` e.g. "3 days 2 hrs remaining" or "Crossed 2 days ago"

**Dashboard cards** (renderOngoingCard ~line 391):
- Below editor badge row, add:
  - Event age line: `"Magh 24 · 32 days old"` in small muted text
  - Edit started line: `"Started 12d 5h ago"` with Clock icon
  - Deadline line (if set): `"Deadline: 3d 2h remaining"` — green if >3 days, amber if ≤3 days, red if crossed

**Classic View table** (VideoEditTable ~line 114):
- Add 3 new column headers: **Event Date**, **Edit Started**, **Deadline**
- Event Date cell: BS date + "(X days old)" 
- Edit Started cell: relative time since `editStartedAt`
- Deadline cell: clickable button that opens a Popover with Calendar + time select. Shows remaining time or "Set" if empty. Red text if crossed.

**Dashboard home — new "Deadlines" section** (after Pipeline Overview ~line 500):
- Header: "Deadlines" with a Clock icon
- Two sub-sections:
  - **Crossed** (red): rows where deadline < now, sorted by how much overdue
  - **Approaching** (amber): rows where deadline is within 3 days, sorted by closest first
- Each item: card showing client · event · edit type · editor · "Crossed X days ago" or "Due in X hrs"

**4. `src/components/video-edit/WtnPipelineView.tsx`**
- Show event age and deadline remaining on pipeline cards if set