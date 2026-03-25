

## Video Edit Tracker — Dashboard with Left Sidebar Navigation

### Concept
Transform the Video Edit Tracker page into a sidebar-based layout. The left sidebar contains navigation tabs: **Dashboard** (new), **Classic View** (current table UI), **Pipeline View** (current pipeline overlay, now inline), and individual **Editor names** (dynamically listed). Clicking an editor shows their personal workload view.

### Layout
```text
┌──────────────┬──────────────────────────────────────────┐
│  SIDEBAR     │  MAIN CONTENT                            │
│              │                                          │
│  📊 Dashboard│  (changes based on sidebar selection)    │
│  📋 Classic  │                                          │
│  🔀 Pipeline │                                          │
│  ──────────  │                                          │
│  EDITORS     │                                          │
│  • Nikit     │                                          │
│  • Saugat    │                                          │
│  • Arjun     │                                          │
│  ...         │                                          │
└──────────────┴──────────────────────────────────────────┘
```

### Dashboard View (new default)
**Top stats cards row:**
- **Current**: The row in EDIT_ON_PROGRESS or EDIT_LAB with highest urgency — shows client name, event name, edit type
- **Next**: Next row in queue after current — same details
- **Last**: Most recently finalized row — client name, event name
- **Finalized**: Total count of finalized items + last few names
- **Re-Edits**: Total count in RE_EDIT_ON_PROGRESS + current re-edit client names

**Below stats**: Summary of all stages as compact cards with counts, color-coded by stage.

### Editor View (when clicking an editor name)
Shows that editor's assigned videos grouped by status priority:
1. **Edit on Progress** (what they're actively editing)
2. **Edit Lab** (preparing to edit)
3. **Queue** (waiting)
4. Remaining stages in pipeline order

Each section shows a compact table/card list with client name, event, edit type, urgency, and stage badge.

### Files Changed

**1. `src/components/video-edit/DesktopVideoEditTracker.tsx`** — Major restructure
- Add `activeView` state: `'dashboard' | 'classic' | 'pipeline' | string` (editor name)
- Extract current table UI into the `classic` view branch
- Render `WtnPipelineView` inline (not overlay) when `activeView === 'pipeline'`
- Add left sidebar (`w-56`, dark theme matching `ClientDetailSidebar` style):
  - Dashboard button (default active)
  - Classic View button
  - Pipeline View button
  - Divider
  - "EDITORS" label + dynamically listed editor names from `editors` state (filtered to `isVideoEditor`)
  - Each editor button shows count of their assigned rows
- **Dashboard view**: Compute `currentEdit` (highest urgency in EDIT_ON_PROGRESS), `nextEdit` (next in queue/edit_lab), `lastFinalized` (most recent finalized by `updated_at`), finalized total, re-edit count. Render as stat cards + stage summary grid.
- **Editor view**: Filter `allRows` by `row.editor === selectedEditor`, group by status with priority order (EDIT_ON_PROGRESS first, then EDIT_LAB, QUEUE, rest). Render as compact card/table sections.

**2. `src/components/video-edit/WtnPipelineView.tsx`**
- Add optional `inline?: boolean` prop. When `true`, skip the fixed overlay wrapper and render content directly (no close button needed, no `fixed inset-0` wrapper).

### Sidebar Design
Dark background (`bg-zinc-900`), white text, active item highlighted with gradient (matching existing `ClientDetailSidebar` pattern). Editor names shown with a colored dot and assignment count badge.

### No database changes needed — all data comes from existing `useVideoEditTracker` hook and `freelancers_cache`.

