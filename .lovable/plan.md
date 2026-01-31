
Goal
- On Desktop Mode, make “Recent Searches” in Master Search:
  1) never “disappear” while you’re searching
  2) stay in a single horizontal row
  3) become scrollable horizontally
  4) show a visible scrollbar once the list reaches 8+ items (and still be scrollable even before that)

What’s happening now (why the last fix didn’t work)
1) The Recent Searches row is only rendered when `query.trim().length < 2`.
   - When you click a recent chip (or type 2+ characters), `query` becomes length ≥ 2, so the entire recent-searches row is removed from the UI.
   - This matches your report: “hidden after third search” (after you start searching again, the row vanishes).
2) Even when the row is visible, on desktop many users can’t easily horizontal-scroll a chips row unless:
   - there is a trackpad, or
   - the OS/browser is configured to always show scrollbars, or
   - the UI implements drag-to-scroll / scroll buttons.
   Right now we only changed CSS classes; we did not add actual “grab/drag” scrolling logic, so with a mouse it can still feel “stuck/hidden”.
3) The scrollbar threshold logic is `recentSearches.length > 8` (shows at 9+). You asked for “once 8 crosses” which most likely means 8+.

Plan (implementation approach)
A) Keep Recent Searches visible while searching (Desktop-first)
- Update `src/components/suite/MasterSearchButton.tsx` so the Recent Searches section is shown whenever Master Search is expanded (not only when query is empty).
- The search results dropdown already appears above the input (`bottom-full`), so keeping recent chips below the input will not overlap results.

Implementation detail:
- Replace this condition:
  - `query.trim().length < 2 && (...)`
- With:
  - `isExpanded && (...)` (or simply render it unconditionally in the expanded UI)
- Optional “clean UI” tweak:
  - If query ≥ 2, hide the “Recent Searches” label text but keep the chips row visible.

B) Make the chips row truly scrollable on Desktop (mouse-friendly)
- Add real desktop interactions on the chips container:
  1) Drag-to-scroll (click + drag horizontally)
  2) Mouse-wheel-to-horizontal-scroll when hovering the chips row (so normal mouse wheels work)
  3) Optional left/right chevron buttons to scroll by a fixed amount (reliable even if OS hides scrollbars)

Implementation detail in `MasterSearchButton.tsx`:
- Add `recentRowRef = useRef<HTMLDivElement>(null)`
- Add pointer drag handlers using refs (no re-renders needed):
  - onPointerDown: store startX + startScrollLeft, set “dragging” ref true, setPointerCapture
  - onPointerMove: if dragging, compute delta and set `scrollLeft`
  - onPointerUp / onPointerCancel: stop dragging and releasePointerCapture
- Add wheel handler:
  - If user scrolls wheel over the row and it overflows horizontally, map `deltaY` into `scrollLeft` and `preventDefault()`
  - This makes a normal mouse wheel reveal hidden chips horizontally.

C) Show scrollbar after 8+ recent searches (and still allow scrolling before that)
- Fix threshold: `recentSearches.length >= 8` (not `> 8`).
- Keep your CSS utilities, but adjust usage:
  - For < 8: keep scrollbar hidden (but still scrollable via drag/wheel/buttons)
  - For ≥ 8: apply `scrollbar-thin` + thumb/track classes so a scrollbar is available.

Important note:
- Some operating systems (and Chrome on Mac) hide scrollbars until scrolling. We cannot fully override OS behavior everywhere.
- That’s why we’ll also add drag + wheel + buttons so it works reliably regardless of scrollbar visibility.

D) Tighten “how many chips we show” (matches your earlier spec)
- The memory/spec says “show 10 most recent searches”.
- Currently the UI renders all (up to 50).
- Update display to:
  - `const recentToShow = recentSearches.slice(0, 10);`
- Scrollbar logic should be based on `recentToShow.length`.

E) CSS adjustments (small, but important)
File: `src/index.css`
- Add a hover variant that actually works for our custom scrollbar classes.
  - The current `hover:scrollbar-thumb-violet-400` (Tailwind-style) does not apply to our custom CSS pseudo-elements.
- Add CSS like:
  - `.scrollbar-thumb-violet-300.hover-thumb-violet-400:hover::-webkit-scrollbar-thumb { background-color: rgb(167 139 250); }`
- Then in TSX use a plain class `hover-thumb-violet-400` (no Tailwind `hover:` prefix).

Files to change
1) `src/components/suite/MasterSearchButton.tsx`
- Render recent chips section even while query is active (expanded state)
- Implement drag-to-scroll + wheel-to-horizontal-scroll
- Add optional left/right scroll buttons (recommended for desktop reliability)
- Change scrollbar threshold to `>= 8`
- Render only top 10 recent searches

2) `src/index.css`
- Add a working hover-style helper for the scrollbar thumb (optional polish)
- Keep existing `scrollbar-thin` / `scrollbar-hide` utilities

Testing checklist (Desktop)
1) Open Suite (Desktop Mode) → open Master Search.
2) Do 3+ searches (click results) so you have multiple recent searches.
3) Expand Master Search again:
   - Recent searches must still be visible even while you type 2+ characters.
4) Add 9–10 recent searches:
   - Row stays one line horizontally.
   - You can access hidden chips by:
     - mouse wheel while hovering the chips row, and/or
     - click-drag the chips row, and/or
     - chevron buttons (if added)
   - At 8+ chips, scrollbar style switches to the thin scrollbar theme.
5) Confirm nothing breaks on Mobile view:
   - Chips still usable with swipe (mobile native scroll).
   - UI doesn’t overflow awkwardly.

Edge cases handled
- If history is still loading: keep skeleton chips row (also horizontally scrollable container).
- If there are fewer than 8 searches: no visible scrollbar, but row remains scrollable (mouse-friendly).
- If OS hides scrollbars: drag/wheel/buttons still guarantee access to all chips.
