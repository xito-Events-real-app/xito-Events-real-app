

# Change SAUGAT SEARCH Shortcut to Ctrl+Space

## Problem
`Ctrl+F` is intercepted by the browser's built-in Find feature before it reaches the app, so the shortcut never triggers SAUGAT SEARCH.

## Solution
Switch the global keyboard shortcut from `Ctrl+F / Cmd+F` to `Ctrl+Space / Cmd+Space`.

## Changes

### File: `src/contexts/SaugatSearchContext.tsx`
- Change the `keydown` listener to detect `Ctrl+Space` (or `Cmd+Space` on Mac) instead of `Ctrl+F`
- Keep `Escape` to close
- Keep toggle behavior (press again to close)

### File: `src/components/suite/DesktopSuiteLanding.tsx`
- Update the search button tooltip/label if it mentions "Ctrl+F" to show "Ctrl+Space" instead

