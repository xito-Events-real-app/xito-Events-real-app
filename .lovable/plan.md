

# Double-Space Shortcut for SAUGAT SEARCH

## Overview
Replace `Ctrl+Space` with a simpler trigger: **tap spacebar twice quickly** (within 400ms). No modifier keys needed. Only works when NOT focused on an input/textarea/contenteditable element.

## Changes

### File: `src/contexts/SaugatSearchContext.tsx`
- Remove the `Ctrl+Space` / `Cmd+Space` listener
- Add a `useRef` to store the timestamp of the last spacebar press
- On each `keydown` for spacebar:
  1. Check if `document.activeElement` is an `input`, `textarea`, or has `contentEditable` -- if so, skip entirely
  2. Compare `Date.now()` with the stored timestamp
  3. If the gap is under 400ms, call `toggle()` and reset the timestamp
  4. Otherwise, store the current timestamp for next press
- Keep `Escape` to close

### Safety
- Forms, search inputs, textareas: spacebar works normally (no interference)
- Only triggers on plain page context (e.g., dashboard, landing pages)

