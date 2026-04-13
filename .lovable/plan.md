

# Album Lock Wizard: Smart Date Selection + Copy Info Enhancement

## Changes

### 1. AlbumLockWizard.tsx — Redesign Step 2 date section

**Pass event details to wizard**: Add `events` prop (array of `{eventName, eventDateAD}`) from `ClientPortal → PortalMyAlbum → AlbumLockWizard`.

**Smart default date**: Find the event containing "wedding" (case-insensitive) in its name. If found, use its date as default. Otherwise fall back to first event date.

**Redesigned date flow in Step 2**:
- Remove the "What do you want on your album?" textarea entirely
- Add a formal info note: *"This date will be printed on your album. Please choose carefully."* styled as a subtle info box
- First ask: AD or BS toggle (same as now but cleaner)
- Then show the calendar picker based on selection
- Default to the wedding event's date (or first event)

**Save `selected_date` with date mode info**: Store as `"AD: May 15, 2026"` or `"BS: Jestha 1, 2083"` so the copy info can display it correctly.

### 2. AlbumSection.tsx — Add album date to Copy Information

- Fetch `selected_date` alongside `bride_name, groom_name` from `album_selection_submissions`
- Add a new line to the copy text: `Album Date: [whatever client chose]`
- Store in `brideGroom` state (extend to include `albumDate`)

### 3. Prop threading

- **ClientPortal.tsx**: Pass `eventDetails` to `PortalMyAlbum`
- **PortalMyAlbum.tsx**: Accept `events` prop, pass to `AlbumLockWizard`
- **AlbumLockWizard.tsx**: Accept `events` prop, use to find wedding date

### Files changed
- `src/components/client-portal/AlbumLockWizard.tsx` — Remove albumText, add info note, smart default date from wedding event
- `src/components/client-portal/PortalMyAlbum.tsx` — Pass events prop through
- `src/pages/ClientPortal.tsx` — Pass eventDetails to PortalMyAlbum
- `src/components/client-detail/AlbumSection.tsx` — Fetch and display `selected_date` in copy info

