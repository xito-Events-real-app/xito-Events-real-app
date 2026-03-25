

## Play/Pause Real-Time Editing Status for Edit on Progress

### Concept
Add a play/pause toggle to each Edit on Progress card on the Dashboard. This tracks which edits are actively being worked on *right now*. The dashboard splits into "Running" and "Paused" sections, and the sidebar editors reflect this state with animated indicators.

### Database Change
Add two columns to `video_edit_tracker`:
- `is_playing` (boolean, default false) — whether actively being edited right now
- `playing_since` (timestamptz, nullable) — when play was started (for sequential ordering)

### Dashboard — Edit on Progress Section

Split into two sub-sections:

```text
▶ RUNNING (2)                          [bold, glowing cards]
┌──────────────────────┐  ┌──────────────────────┐
│ ▶ PABINA · Full Video│  │ ▶ JIGYASHA · HL      │
│   Nikit · Urgency 5  │  │   Amreet · Urgency 4 │
│   [glow + pulse]     │  │   [glow + pulse]      │
└──────────────────────┘  └──────────────────────┘

⏸ PAUSED (3)                           [greyed, still cards]
┌──────────────────────┐  ┌──────────────────────┐
│ ⏸ RIYA · Reel        │  │ ⏸ SITA · Full Video  │
│   Barun · Urgency 3  │  │   Ramesh · Urgency 2 │
│   [muted/greyed]     │  │   [muted/greyed]      │
└──────────────────────┘  └──────────────────────┘
```

- **Running cards**: Blue glow border animation, subtle pulse effect
- **Paused cards**: Slightly greyed (`opacity-60`), no animation
- Play/Pause toggle button on each card
- Running cards sorted by `playing_since` ascending (who started first appears first)

### Sidebar Editor Effects

- **Editors with running rows**: Green dot + CSS wave/pulse animation on their name (e.g., `animate-pulse` or custom wave keyframe)
- **Editors with only paused/non-running progress rows**: Green dot but static, no animation
- **Editors NOT in any progress stage**: Shown in *italic* text

### Files Changed

**1. Database migration** — Add `is_playing` and `playing_since` columns to `video_edit_tracker`.

**2. `src/lib/video-edit-api.ts`** — Add `isPlaying: boolean` and `playingSince: string` to `VideoEditRow` interface and `dbToRow` mapper.

**3. `src/hooks/useVideoEditTracker.ts`** — Pass through `isPlaying`/`playingSince` in `DisplayRow`. Add `togglePlaying(id, mergedIds?)` function that flips `is_playing` and sets/clears `playing_since`.

**4. `src/components/video-edit/DesktopVideoEditTracker.tsx`**:
- **DashboardView**: Split `editOnProgressRows` into `runningRows` (is_playing=true, sorted by playing_since asc) and `pausedRows`. Render two sections with bold headers. Add play/pause icon button to each card. Running cards get `animate-pulse shadow-blue-500/30 shadow-lg` classes. Paused cards get `opacity-60`.
- **VideoEditSidebar**: Editors with running rows get a pulsing wave animation class on their name. Editors in progress but not running are static. Editors not in any progress stage get `italic` text style.

**5. `src/index.css`** — Add a subtle wave/glow keyframe animation for the sidebar editor names who are actively editing.

### Toggle Behavior
- Click Play → sets `is_playing=true`, `playing_since=now()` in DB
- Click Pause → sets `is_playing=false`, `playing_since=null` in DB
- Real-time sync ensures all systems see the change instantly

