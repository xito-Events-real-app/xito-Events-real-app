
# File Management Dashboard Page

## Overview
Transform the File Management page from a direct crew table view into a proper dashboard with a hero stats section at the top, followed by an "All Files" section containing the existing read-only crew table. The design will feel like a professional file management hub.

## Layout

```text
+-----------------------------------------------+
|  [Back]   File Management         [icon]       |
+-----------------------------------------------+
|                                                |
|  DASHBOARD HERO SECTION                        |
|  +-------------------------------------------+ |
|  | Total Clients: 42  | Assigned: 108/285    | |
|  | Remaining: 177     | Completion: 38%      | |
|  +-------------------------------------------+ |
|                                                |
|  +-------------------------------------------+ |
|  | ALL FILES                    [folder icon] | |
|  | View all event crew assignments            | |
|  |                                            | |
|  | [AllClientsCrewTable readOnly=true]         | |
|  |                                            | |
|  +-------------------------------------------+ |
+-----------------------------------------------+
```

## Changes

### `src/pages/FileManagement.tsx` (rewrite)
- Add a dashboard wrapper with:
  - **Header bar**: Back button + "File Management" title + folder icon
  - **Stats Cards Row**: 4 compact stat cards showing:
    - Total Events (from filtered rows count)
    - Assigned Crew (assigned/required)
    - Remaining (unassigned required count, red-tinted)
    - Completion % (progress bar)
  - **"All Files" Section**: A card container with a section header ("All Files -- Event Crew Assignments") wrapping the existing `AllClientsCrewTable` with `readOnly={true}`
- The stats will be computed by reading the same data the crew table uses, passed up via a callback or computed independently
- Design uses cyan-to-blue gradient (matching the module's gradient) for the header and stat card accents

### Technical Approach
Since `AllClientsCrewTable` already computes stats internally, the simplest approach is to:
1. Create a new `FileManagementDashboard` component wrapping everything
2. Add an `onStatsReady` callback prop to `AllClientsCrewTable` that reports `{ totalEvents, assignedCount, requiredCells, remainingCount }` whenever stats are computed
3. The dashboard renders the stats cards using this data
4. The crew table renders below inside a styled card section

### Files to Modify

**`src/components/suite/AllClientsCrewTable.tsx`**
- Add optional `onStatsReady?: (stats: { totalEvents: number; assignedCount: number; requiredCells: number; remainingCount: number }) => void` prop
- Call it inside the existing `useMemo` that computes stats, via a `useEffect`

**`src/pages/FileManagement.tsx`**
- Complete rewrite into a dashboard layout with:
  - Gradient header with back navigation
  - 4 stat cards (Total Events, Assigned, Remaining, Completion %)
  - "All Files" section card containing the read-only crew table
  - Professional styling with the cyan-blue gradient theme
  - Folder/file-themed iconography throughout
  - A subtle description: "Central hub for viewing all event crew files and assignments"

### Design Details
- Stat cards use glass-effect backgrounds with colored icon accents
- Progress bar for completion percentage (green when > 70%, amber 40-70%, red < 40%)
- "Remaining" card pulses red when count > 0 (reuses `animate-pulse-red`)
- Section header for "All Files" has a folder icon and subtle border
- Mobile-responsive: stat cards stack 2x2 on mobile
