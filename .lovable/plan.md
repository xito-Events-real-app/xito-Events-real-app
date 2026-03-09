

## Auto-Populate Video Edit Tracker with Past Events Only

### Problem
- Rows require manual "Generate Rows" button click
- No filtering — future events would also appear

### Changes

**1. `supabase/functions/google-sheets/index.ts` — `generateVideoEditRows` function (~line 8213)**
- Add date filter: only generate rows where `eventDateAD < today` (past events only)
- Compare each deliverable's event date against current date, skip if event hasn't happened yet

**2. `src/hooks/useVideoEditTracker.ts` — Auto-generate on load**
- After `loadRows()` completes, if result is empty (no rows returned from sheet), automatically call `generateRows()`
- Also filter out any rows with future `eventDateAD` on the client side (safety net)

**3. `src/hooks/useVideoEditTracker.ts` — Client-side date filter**
- In `queueRows` and `labRows` memo computations, filter out rows where `eventDateAD >= today`

**4. `src/components/video-edit/DesktopVideoEditTracker.tsx`**
- Keep "Generate Rows" button for manual re-sync but auto-trigger is the primary flow

### Flow
```text
Page loads → loadRows() → sheet empty? → auto-generate → 
edge function scans deliverables → filters past events only → 
appends to sheet → reload rows → display
```

### Files Changed
- `supabase/functions/google-sheets/index.ts` — Add date filter in generateVideoEditRows
- `src/hooks/useVideoEditTracker.ts` — Auto-generate on empty + client-side date filter

