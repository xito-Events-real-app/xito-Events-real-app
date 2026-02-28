

# Floating Compact Benzo Keep ("KK" Shortcut)

## Overview

A floating, draggable, non-modal Benzo Keep notepad triggered by double-tapping the "K" key (within 400ms). Mirrors the existing "BB" Booking Calendar pattern exactly. Compact mode: only recent clients list + note editor (textarea + color picker). No Xito Search, no Booking Calendar, no new client creation form.

## Files to Create

### 1. `src/contexts/BenzoKeepPopupContext.tsx`
A context provider identical in structure to `BookingCalendarPopupContext.tsx`:
- Listens for double-tap "K" key (400ms window)
- Skips when focus is in input/textarea/contentEditable
- Escape to close
- Exposes `isOpen`, `open`, `close`, `toggle`

### 2. `src/components/shared/FloatingBenzoKeep.tsx`
A floating window rendered via `createPortal`, same drag/resize pattern as `FloatingBookingCalendar.tsx`:
- z-index 250 (same level as floating calendar)
- Default size ~380x500, min 320x350, max 700x650
- Draggable header bar with "Benzo Keep" title + close button
- Resize handle in bottom-right corner

**Content (compact mode):**
- Recent clients search list (reuses filtering logic from `BenzoKeepClientPanel`)
- When a client is selected: load their existing Benzo Keep note into the textarea
- Color picker (5 marker colors)
- Textarea for note content
- Two buttons: "Save Unassigned" (when no client selected) and "Save to [Client]" (when client selected)
- Saves to database + memory cache + dispatches cache update (reuses same save logic from the notepad dialog)

## File to Modify

### 3. `src/App.tsx`
- Import `BenzoKeepPopupProvider` and wrap it alongside `BookingCalendarPopupProvider`
- Import and render `<FloatingBenzoKeep />` alongside `<FloatingBookingCalendar />`

## Technical Details

- The floating component manages its own state (content, color, selected client, recent clients) internally -- no shared state with the full BenzoKeepNotepadDialog
- Client list loaded from memory cache (`getMemoryClients()`) for instant access, no API call needed for the compact version
- Save logic: upsert to `clients_cache` for existing clients, `saveUnassignedBenzoKeepNote` for unassigned -- same as the full dialog
- The "KK" shortcut will NOT conflict with "BB" or "space-space" since they listen for different keys
