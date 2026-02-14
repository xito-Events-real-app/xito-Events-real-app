
# File Management Module -- Read-Only All Clients View

## Overview
Activate the "File Management" module on the Suite home page and create a new page that renders the `AllClientsCrewTable` component in **read-only mode**. All data stays in sync automatically since it reads from the same data source.

## Changes

### 1. `src/lib/suite-modules.ts`
- Change `file-management` status from `'coming-soon'` to `'active'`

### 2. `src/components/suite/AllClientsCrewTable.tsx`
- Add a `readOnly?: boolean` prop to `AllClientsCrewTableProps`
- When `readOnly` is true:
  - Hide all edit buttons (the `+` assign buttons in `CrewCell`, category lock toggles, Quick Add Freelancer)
  - Hide sync/push/pull buttons in header
  - Hide delete/clear actions in the freelancer hover popover
  - Make crew cells display-only (no click handlers)
  - Keep all visual styling intact (red pulse for unassigned, day colors, filters, search)
  - Keep navigation (clicking a client name still opens detail)
  - Header title changes to "File Management" or similar

### 3. `src/pages/FileManagement.tsx` (new file)
- Simple page that renders `AllClientsCrewTable` with `readOnly={true}` and `onClose` navigating back to `/`

### 4. `src/App.tsx`
- Replace the `/files` route from `ComingSoon` to the new `FileManagement` page

## Technical Details

In `AllClientsCrewTable.tsx`, the `readOnly` prop gates interactivity:

```text
CrewCell component:
  - readOnly=true --> render name as plain text badge (no click to reassign)
  - readOnly=true --> hide the "+" button for empty cells (show "---" instead)

Header bar:
  - readOnly=true --> hide Sync, Push, Pull buttons
  - readOnly=true --> hide Quick Add Freelancer button
  - Title shows "File Management" instead of "All Clients"

FreelancerHoverInfo:
  - readOnly=true --> hide "Remove" and "Reassign" actions
  - Keep WhatsApp send and schedule link (view-only actions)

Category selector:
  - readOnly=true --> hide the lock/edit category button
```

Filters (month, year, day, search) remain fully functional for browsing. The red pulse animation for unassigned required roles also remains visible as a status indicator.
