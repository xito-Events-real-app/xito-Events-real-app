
# ALL CLIENTS -- Full Screen Redesign + Show All Data

## Problems Found

1. **Data range capped at 1000 rows** -- The backend reads `A2:R1000`. If your sheet has more than ~999 client rows, they get cut off.
2. **Not full screen** -- The table is squeezed inside the dashboard content area with the left sidebar and news panel visible. It should take over the entire screen.
3. **Plain table UI** -- The current design is a basic grid with minimal styling. Needs a polished, production-grade look.

## What Changes

### 1. Expand Data Range (Backend)

**File: `supabase/functions/google-sheets/index.ts`**

Change the sheet range from `A2:R1000` to `A2:R5000` to capture all your client data. This ensures no rows are silently dropped.

### 2. Full-Screen Overlay Mode

**File: `src/components/suite/AllClientsCrewTable.tsx`**

Redesign the component to render as a **full-screen fixed overlay** (like a modal that covers the entire viewport), with:
- A top toolbar with title, filters, refresh, event count, and a close button
- The table takes up the entire remaining height
- No sidebar, no news panel visible -- just the crew table

### 3. Visual Upgrade

Same file -- complete UI overhaul:
- **Dark header bar** with gradient (violet-to-purple) matching the app branding
- **Sticky column headers** with better contrast and color-coding:
  - Amber background for Photographer columns (PB, PG, EP)
  - Purple background for Videographer columns (VB, VG, EV)
  - Emerald background for Assistant column
  - Cyan background for iPhone, Drone, FPV columns
- **Alternating row stripes** for readability
- **Assigned cells** show colored pills (emerald background with name)
- **Empty cells** show a subtle dashed border with "+" icon instead of plain "Assign" text
- **Row hover effect** with a left border highlight
- **Client names are clickable** -- navigate to client detail page
- **Event count badge** in the header

### 4. Remove Wrapper ScrollArea

**File: `src/components/suite/SuiteDashboardContent.tsx`**

When `showAllClients` is true, render `AllClientsCrewTable` directly as a full-screen overlay instead of inside the dashboard scroll area. This removes the nested scrolling issue.

### 5. Close Button to Return

Add a close/back button in the top-left of the full-screen view that sets `showAllClients` back to false, returning to the normal dashboard.

---

## Technical Details

### File 1: `supabase/functions/google-sheets/index.ts`
- Change line with range `A2:R1000` to `A2:R5000` in the `getAllFreelancerAssignments` function

### File 2: `src/components/suite/AllClientsCrewTable.tsx`
Complete rewrite with:
- Outer container: `fixed inset-0 z-[100] bg-white flex flex-col` for true full-screen
- Top bar: gradient header with filters inline, close button (X icon), refresh, event count
- Table header: sticky with color-coded column groups
- Table body: native `overflow-y-auto` (no nested ScrollArea) filling remaining height
- Crew cells: color-coded pills for assigned, dashed empty state for unassigned
- `onClose` prop to exit full-screen mode

### File 3: `src/components/suite/SuiteDashboardContent.tsx`
- Pass `onCloseAllClients` callback to `AllClientsCrewTable`
- Render the table outside the ScrollArea wrapper when active

### File 4: `src/components/suite/DesktopSuiteLanding.tsx`
- Pass `setShowAllClients(false)` as the close handler through to `SuiteDashboardContent`

### Files Summary

| File | Change |
|------|--------|
| `supabase/functions/google-sheets/index.ts` | Expand range to R5000 |
| `src/components/suite/AllClientsCrewTable.tsx` | Full rewrite -- full-screen overlay + visual upgrade |
| `src/components/suite/SuiteDashboardContent.tsx` | Pass close handler, render outside scroll wrapper |
| `src/components/suite/DesktopSuiteLanding.tsx` | Pass close callback |
