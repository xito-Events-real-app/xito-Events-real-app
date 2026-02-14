
# Integrated Client Management in Benzo Keep Notepad

Add a dedicated Client Management panel to the Benzo Keep notepad dialog. This allows for rapid client creation and selection without leaving the note-taking flow, keeping the note editor exactly where it is.

## Technical Changes

### 1. New Component: `src/components/suite/BenzoKeepClientPanel.tsx`
Create a panel specifically for the notepad dialog that handles:
- **Quick-Add Form**: High-density inputs for `Client Name`, `Contact No`, `WhatsApp No`, and `Source` (dropdown).
- **Recent Clients List**: A scrollable section at the bottom showing the 10-15 most recently added clients.
- **Client Selection Logic**: Clicking a recent client populates the panel with their details (name, contact, etc.) and sets them as the active target for the note.
- **Full Form Access**: A button/link that opens the universal quick-add form (`/client-tracker/quick-add`) with the current fields pre-filled if necessary.
- **Clear/Reset**: An option to deselect a client and return to "New Client" mode.

### 2. Update `src/components/suite/BenzoKeepNotepadDialog.tsx`
- **Desktop Layout**: Replace the `BookingCalendarMini` in the right column (`col-span-1`) with the new `BenzoKeepClientPanel`. This maintains the 4-column grid structure.
- **Mobile Layout**: Add the Client Panel as a collapsible `Collapsible` section between the date converter and the note textarea.
- **State Management**:
    - Track `selectedClient` (from recent list).
    - Track `quickClientData` (for the new client form).
- **Saving Workflow**:
    - **Unassigned**: Saves to the general note pool (as it does now).
    - **Existing Client**: Assigns the note directly to the selected client's Column AL.
    - **New Client**: First creates the client record via `addClient()`, then assigns the note to their newly generated ID.

### 3. Logic Refinements
- **Auto-formatting**: Ensure WhatsApp numbers are handled correctly (tel input pattern).
- **Source Dropdown**: Fetch real sources from the `useCachedData` hook (or `DropdownData` from `sheets-api`).
- **Confirmation**: Show clear feedback when a new client is created and a note is assigned simultaneously.

## User Experience Flow
1. Open Benzo Keep note dialog.
2. Type your notes in the center section (place stays same).
3. On the right (Desktop) or in the accordion (Mobile):
    - **Option A**: Click a recent client (e.g., "Sita") to quickly link the note to her.
    - **Option B**: Type "Hari", his number, and source "INSTAGRAM", then hit "Save & Create Client".
    - **Option C**: Just hit "Save Unassigned" if you're not ready to link it yet.

## Technical Details (Internal)
- Use `useNavigate` for the "Full Form" redirection.
- Use `getClientsForNoteAssignment` to populate the recent list.
- Generate `registeredDateTimeAD` using `new Date().toISOString()` for new clients to ensure unique IDs.

