

## WTN Ongoing Edits + Sidebar Editor Groups + Play/Pause Everywhere

### Summary

1. Rename "Edit on Progress" section on dashboard to **"WTN Ongoing Edits"** and include rows from EDIT_ON_PROGRESS, COLOR_ON_PROGRESS, and RE_EDIT_ON_PROGRESS (with stage badge on each card).
2. Make Running/Paused headers larger and centered.
3. Show play/pause glow effects in Classic and Pipeline views for EDIT_ON_PROGRESS rows too (not just dashboard).
4. Restructure sidebar editors into grouped sections: **Active Editors** → **Paused Editors** → **On Queue** → **Edit Lab Editors** → **Available Editors**.

### Changes

**1. `src/components/video-edit/DesktopVideoEditTracker.tsx`**

**DashboardView changes (lines ~355-458):**
- Rename header from "Edit on Progress" to **"WTN Ongoing Edits"**
- Combine rows from `EDIT_ON_PROGRESS`, `COLOR_ON_PROGRESS`, `RE_EDIT_ON_PROGRESS` into the running/paused split
- Add a small stage badge on each card (e.g., "Edit", "Color", "Re-Edit")
- Make "RUNNING" and "PAUSED" headers `text-base font-bold` instead of `text-xs`

**VideoEditSidebar changes (lines ~780-893):**
- Replace single "Editors" list with 5 grouped sections:
  - **Active Editors**: editors with `isPlaying` rows in progress stages → pulsing green dot + wave animation, listed first
  - **Paused Editors**: editors in progress stages but NOT playing → static green dot
  - **On Queue**: editors only in QUEUE stage (not in progress, not in edit lab)
  - **Edit Lab**: editors only in EDIT_LAB (not in progress, not in queue)
  - **Available**: editors with no rows in any of the above stages
- Props: pass `rowsByStatus` to sidebar so it can compute groupings, or compute groups in parent and pass as structured data
- Each group has a small label header (text-[10px] uppercase)

**Classic/Pipeline view effects:**
- In `VideoEditTable` (Classic view): for EDIT_ON_PROGRESS stage rows, add `animate-editing-glow` class to running rows and `opacity-60` to paused rows
- In `WtnPipelineView`: same glow/dim treatment for EDIT_ON_PROGRESS cards based on `isPlaying`

**2. `src/components/video-edit/WtnPipelineView.tsx`**
- In `PipelineCard`: if `stageKey` is a progress stage and `row.isPlaying`, add glow class. If paused, add `opacity-60`.

### Sidebar Structure
```text
── Active Editors ──
  🟢~ Phurba          (3)
  🟢~ Deepak          (2)
  🟢~ Sabin           (1)

── Paused Editors ──
  🟢  Ayushman        (2)
  🟢  Saugat          (1)

── On Queue ──
  ⚪  Ramesh          (4)

── Edit Lab ──
  ⚪  Amreet          (2)

── Available ──
  ⚪  Barun           (0)
```

### Files Changed
1. `src/components/video-edit/DesktopVideoEditTracker.tsx` — Dashboard section rename + combine 3 progress stages, sidebar restructure into 5 groups, classic view glow/dim
2. `src/components/video-edit/WtnPipelineView.tsx` — Glow/dim on progress-stage cards based on isPlaying

