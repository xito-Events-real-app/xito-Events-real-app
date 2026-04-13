

# Lock & Send for Design — Album Completion Flow

## Overview
Add a multi-step "Lock & Send for Design" wizard to the `PortalMyAlbum` component, plus an automatic popup when all albums reach 140/140.

## Flow

### Auto-popup (all albums full)
When every configured album has exactly 140 selections, a Dialog auto-opens: "You've selected all your photos! Ready to send for design?" with "Yes, Proceed" and "Not Yet" buttons.

### "Lock & Send for Design" button
A rose-gold button at the top of the My Album tab. Clicking opens a multi-step Dialog:

**Step 1 — Confirmation**
"Have you finalized your photo selection for all albums?" Yes/No.

**Step 2 — Name & Date**
- Pre-filled Bride first name and Groom first name (from contact data, editable)
- Date input with AD/BS toggle; each mode shows a calendar defaulting to the client's first event date
- Free text: "What do you want on your album?" (e.g., the date text they want printed)

**Step 3 — Send via WhatsApp**
Shows two buttons:
- **Benjona (9705255025)**
- **Nikit (9749494560)**

Clicking either opens WhatsApp with a pre-filled message:
```
Hi {Benjona/Nikit},

Album selection completed! 🎉

Bride: {brideName}
Groom: {groomName}
Date: {selectedDate}

Album Details:
- {albumName}: {count} photos
- {albumName}: {count} photos

Please proceed with the design.
```

## Technical Details

### New component: `src/components/client-portal/AlbumLockWizard.tsx`
Multi-step Dialog component receiving:
- `albums`, `selections` (for counts)
- `brideName`, `groomName` (from contact data)
- `firstEventDateAD` (for calendar default)
- `open`/`onOpenChange`

Uses `Dialog` + internal step state. Step 2 uses the existing `Calendar` component (AD mode) and `NepaliCalendar` (BS mode) with a toggle.

### Modified: `src/pages/ClientPortal.tsx`
- Pass `contactData` and `eventDetails` down to `PortalMyAlbum` (bride/groom names + first event date)

### Modified: `src/components/client-portal/PortalMyAlbum.tsx`
- Accept new props: `brideName`, `groomName`, `firstEventDateAD`
- Add "Lock & Send for Design" button above album tabs
- Add auto-popup logic: `useEffect` checks if all albums are at MAX_PHOTOS; if so, open the wizard automatically (once per session via a `useRef` flag)
- Render `AlbumLockWizard`

### No database changes needed
This is a client-side wizard that opens WhatsApp — no persistence required.

