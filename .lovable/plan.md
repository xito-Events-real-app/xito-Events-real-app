

# Benzo Keep Client Panel Overhaul

## Summary of Changes

### 1. Remove fields after Status in the top form bar
Remove Event, Year, Month, Day fields from the horizontal form row. Keep only: **Name, Phone, WhatsApp, Source, Handler, Status**. Space them properly with wider widths so the Client Full Name is fully visible.

### 2. Fix: Clicking a client name loads their Keep Notes + auto-fills form fields
The current `handleSelectClient` in the dialog correctly parses `benzoKeepNotes`, but the `BenzoKeepClientPanel` bypasses this -- when a client is selected, it shows a "Selected Client" view instead of populating the form fields. Fix:
- When a client is selected, populate **all quick-add fields** (Name, Phone, WhatsApp, Source, Handler, Status) with the client's data
- Call `onSelectClient(client)` which triggers the existing `handleSelectClient` in the dialog that loads their Benzo Keep notes into the textarea
- Keep the form fields editable but pre-filled, instead of showing the separate "Selected" card

### 3. Booked Clients-style graphics for the top section
Style the top bar with a dark slate theme similar to `EventClientCard` / Booked Clients:
- Dark background (`bg-slate-800/90`) with light text
- Gradient avatar circles and colored badges
- Clean card-style separation between form row and recent clients row

### 4. Recent Clients: Replace scrollbar with "Show More" button
Instead of `overflow-x-auto` with a visible scrollbar, show a limited number of client chips (e.g., 8) and place a "More" button at the right end that reveals additional clients when clicked.

### 5. Hover on client name shows client details (HoverCard)
Use `@radix-ui/react-hover-card` (already installed) to show a rich preview card when hovering over a client chip in the Recent Clients row. The card will display:
- Client Name, Contact, WhatsApp
- Events, Event Date (BS)
- Source, Handler, Status
- Similar to what's shown on the Client Detail page dashboard

## Technical Details

### File: `src/components/suite/BenzoKeepClientPanel.tsx`

**Form row changes:**
- Remove Event/Year/Month/Day inputs and the Full Form button from the horizontal layout
- Increase Name input width to `w-48` so full names are visible
- Apply Booked Clients dark theme: `bg-slate-800/90 text-white` for the container, lighter inputs with dark text

**Client selection auto-fill:**
- Remove the separate "Selected Client" card view (lines 72-98)
- Instead, when `selectedClient` is set, populate `quickData` fields via `onQuickDataChange` with client's data and show a "Clear" button
- The `onSelectClient` callback in the dialog already handles loading notes

**Recent clients row:**
- Track `visibleCount` state (default 8)
- Show `clients.slice(0, visibleCount)` chips
- Add a "More" `Button` at the end that increments `visibleCount` by 8
- Remove `overflow-x-auto`, use `flex-wrap` instead or keep inline with hidden overflow

**HoverCard on client chips:**
- Wrap each client chip button in `HoverCard` + `HoverCardTrigger` + `HoverCardContent`
- HoverCardContent shows: Name, Phone, WhatsApp, Events, Date, Source, Handler, Status

### File: `src/components/suite/BenzoKeepNotepadDialog.tsx`

**Update `handleSelectClient`:**
- In addition to loading notes, also call `setQuickClientData` with the client's fields (name, phone, whatsapp, source, handler, status)
- This ensures the top form fields auto-populate when clicking a client name

