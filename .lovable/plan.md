

# Detailed Video Edit Time Tracking

## Problem
Currently, only a single "Total Time" (from `edit_started_at` to now/finalized) is shown. The user needs granular breakdowns: Edit Time, Color Time, Total Time, Actual Time (excluding pauses), Finalized Time, and Client Review Time.

## Current Data Limitations
- **`stage_history`** records stage transitions as `STATUS [ISO_DATE]` lines — good for computing stage-to-stage durations.
- **Pause/resume is NOT logged** — `togglePlaying` only sets `is_playing` and `playing_since` without appending to history. This means we **cannot retroactively compute paused time** for existing data.

## Plan

### 1. Record pause/resume events in `stage_history`
**File: `src/hooks/useVideoEditTracker.ts`** — Update `togglePlaying` to:
- Fetch current `stage_history` before updating
- Append `PAUSED [ISO_DATE]` or `RESUMED [ISO_DATE]` to `stage_history`
- Continue setting `is_playing` and `playing_since` as before

### 2. Create a shared time-computation utility
**New file: `src/lib/video-edit-time-utils.ts`**

Parse `stage_history` (newline-separated `STATUS [ISO_DATE]` entries) and compute:

| Metric | Calculation |
|--------|-------------|
| **Edit Time** | Time from `EDIT_ON_PROGRESS` entry to `COLOR_QUEUE` entry |
| **Color Time** | Time from `COLOR_ON_PROGRESS` entry to `EXPORT_QUEUE` entry |
| **Total Time** | Time from `EDIT_ON_PROGRESS` to `EXPORT_QUEUE` (or now if not yet reached) |
| **Actual Time (excl. pause)** | Total Time minus sum of all `PAUSED→RESUMED` intervals. Show paused duration in brackets. |
| **Finalized Time** | Time from `EDIT_ON_PROGRESS` to `FINALIZED` (only if finalized) |
| **Client Review Time** | Time from `CLIENT_REVIEW` entry to next stage (`RE_EDIT_ON_PROGRESS` or `FINALIZED`) |

### 3. Update YouTube Dashboard metadata panel
**File: `src/components/suite/YouTubeDashboard.tsx`** (lines ~910-954)

Replace the single "Total Time" row with an expandable details section:
- Show **Edit Time** and **Color Time** as the primary two items in the grid (replacing "Total Time")
- Add a small "More timing details" toggle that reveals: Total Time, Actual Time (excl. pause), Finalized Time, Client Review Time
- Use distinct icons/colors for each metric
- Only show metrics that have data (e.g., Color Time only after `COLOR_ON_PROGRESS`)

### 4. Update Floating YouTube Player metadata bar
**File: `src/components/shared/FloatingYouTubePlayer.tsx`** (lines ~230-270)

- Replace the single "Edit Time" with the same computed breakdowns
- Show Edit Time + Color Time inline; Total/Actual/Finalized in a tooltip or second row on hover
- Keep the compact layout intact

### 5. Update FloatingYouTubePlayerContext type
**File: `src/contexts/FloatingYouTubePlayerContext.tsx`**

Add `stageHistory?: string` to `FloatingYouTubeVideo` so the floating player can compute times.

### 6. Fix runtime errors (silent fix)
**Files: `src/contexts/BenzoKeepPopupContext.tsx`, `src/contexts/BookingCalendarPopupContext.tsx`**

Add null guard: `if (!e.key) return;` before the `.toLowerCase()` call.

## Technical Notes
- Stage history format: `STATUS [2025-01-15T10:30:00.000Z]\nSTATUS2 [...]`
- Pause events will be: `PAUSED [ISO]\nRESUMED [ISO]`
- All time parsing is client-side from the `stage_history` string — no new DB columns needed
- Existing data will show Edit/Color/Total times accurately (from stage transitions) but Actual Time will only be accurate for future edits (since pause events weren't previously recorded)

