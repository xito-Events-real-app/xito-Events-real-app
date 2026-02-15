
# Add Freelancer Schedule Demo Link to All Clients Header

## Overview
Add a small demo link button in the All Clients header bar that opens the freelancer schedule page (`/crew-schedule/:name`) in a new tab, so you can quickly preview the calendar changes without needing to send a WhatsApp message first.

## Changes

### `src/components/suite/AllClientsCrewTable.tsx`
- Add an `ExternalLink` icon import from lucide-react
- In the header bar (after the title area, around line 423), add a small button labeled "Preview Crew Link" with an external-link icon
- Clicking it opens a new browser tab pointing to the published URL: `https://wtnclienttracker.lovable.app/crew-schedule/Demo`
- The button uses `window.open()` with `_blank` target
- Styled as a subtle pill button (`bg-white/15 hover:bg-white/25`) to match the existing header aesthetic
- Visible in both regular and readOnly modes since it is a view-only action

### Technical Detail
```text
Header bar addition (after the title):
  <a
    href="https://wtnclienttracker.lovable.app/crew-schedule/Demo"
    target="_blank"
    className="flex items-center gap-1 text-xs bg-white/15 px-2.5 py-1 rounded-full hover:bg-white/25"
  >
    <ExternalLink className="w-3 h-3" />
    Preview Crew Link
  </a>
```

This uses a real freelancer name from the assignments if possible, or falls back to "Demo". Since the crew schedule page handles any name gracefully (shows empty calendar if no assignments found), this will always work.
