
# Full-Screen Benzo Keep Notepad with Client Panel on Top + Load Client Notes

## What Changes

### 1. Full-Screen Dialog
- Change the dialog size from `max-w-[90vw] max-h-[85vh]` to true full-screen: `w-screen h-screen max-w-none max-h-none rounded-none`

### 2. Restructured Desktop Layout
Instead of the current 4-column grid, switch to a **top bar + main content** layout:
- **Top Bar**: Client Quick-Add form (inline, horizontal) + Recent Clients list (horizontal scroll or compact)
- **Main Content Area**: The existing 3-column grid below (Xito Search | Note Editor + Date Converter + Color Picker | Booking Calendar)

This keeps ALL existing elements in their places -- just adds the client panel on top.

### 3. Load Client's Benzo Keep Notes on Selection
When a client is clicked from the recent clients list:
- Read their `benzoKeepNotes` field from the `ClientData` object
- Parse the JSON (using the existing `parseBenzoKeepNotes` pattern from `BenzoKeepDialog.tsx`)
- Populate the note textarea with the client's existing note content
- Set the marker color to match their existing note color

### Technical Details

**File: `src/components/suite/BenzoKeepNotepadDialog.tsx`**
- Dialog: change to full-screen classes
- Move `BenzoKeepClientPanel` from the left column to a **horizontal bar above** the grid
- Keep the 3-column grid below: Xito Search (left) | Note Editor (center 2 cols) | Booking Calendar (right)
- Add `onSelectClient` handler that also loads notes: when a client is selected, parse `client.benzoKeepNotes` and set `content` and `markerColor`

**File: `src/components/suite/BenzoKeepClientPanel.tsx`**
- No major changes needed -- it already handles selection and quick-add
- May adjust layout slightly for horizontal top-bar rendering

**File: `src/components/client-detail/BenzoKeepDialog.tsx`**
- Import `parseBenzoKeepNotes` from here to reuse in the notepad dialog for parsing client notes

### Mobile Layout
- Stays as-is (collapsible section) but the dialog becomes full-screen on mobile too

### User Flow
1. Open Benzo Keep notepad -- full-screen dialog appears
2. Top: Quick-add client form + recent clients list visible immediately
3. Click a recent client -- their existing Benzo Keep notes populate the textarea
4. Edit/write notes in the center area
5. Xito Search on left, Booking Calendar on right -- all preserved
6. Save: unassigned, assign to selected client, or create new client + assign
