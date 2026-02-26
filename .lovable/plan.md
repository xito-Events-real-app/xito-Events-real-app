

# SAUGAT SEARCH -- Global Spotlight Search (Yellow Betting Theme)

## Overview

Replace the bottom-left "Master Search" with **SAUGAT SEARCH** -- a global, centered spotlight overlay with a yellow/gold betting-app theme, triggered by `Ctrl+F` from any page or a header icon button. Features a 0.5s opening animation, a 2-second sound effect, and bold betting-game typography.

---

## Visual Theme

- **Color palette**: Bright yellow (#FFD700 gold), dark black (#111) background panel, amber/orange accents -- inspired by betting/casino apps
- **Font style**: Bold, uppercase, tight tracking -- "SAUGAT SEARCH" branding in gold gradient text with glow
- **Input field**: Dark background with yellow/gold border, gold placeholder text
- **Recent search chips**: Black background with gold text and gold border
- **Results**: Dark cards with gold accents
- **Close button**: Gold X icon, top-right of the panel

---

## Changes

### 1. New File: `src/contexts/SaugatSearchContext.tsx`
Simple React context exposing `{ isOpen, open(), close(), toggle() }` so any component can trigger the search.

### 2. New File: `src/components/suite/SaugatSearch.tsx`
The main overlay component, containing:

- **Full-screen dark backdrop** (black 70% opacity) that closes on click
- **Centered panel** (~700px wide) with dark background, gold border glow
- **"SAUGAT SEARCH" title** in gold gradient, uppercase, bold, with text-shadow glow
- **Search input** with gold styling
- **Recent searches** row (migrated from MasterSearchButton) -- fix click bug by only treating as drag when pointer moves > 5px
- **Results dropdown** below input (not above, since centered)
- **Close button** (gold X) in top-right corner
- **All existing search logic** preserved (client search, recent search save/load, result navigation)

### 3. Animation (0.5 seconds)
CSS keyframes added to `src/index.css`:

```text
@keyframes saugat-search-backdrop
  0%: opacity 0
  100%: opacity 1
  Duration: 0.3s ease-out

@keyframes saugat-search-panel
  0%: scale(0.7), blur(12px), opacity(0)
  60%: scale(1.03), blur(0), opacity(1)
  100%: scale(1), blur(0), opacity(1)
  Duration: 0.5s cubic-bezier spring

@keyframes saugat-search-glow
  0%, 100%: box-shadow gold 20px
  50%: box-shadow gold 40px + amber 60px
  Duration: 2s infinite
```

### 4. Sound Effect
- Play a short "power-up / slot machine" sound when search opens (one-shot, ~2 seconds)
- Uses an `Audio` object, played once per open
- Sound URL: a free CDN whoosh/power-up sound (same pattern as BottomNav sync sound)

### 5. Keyboard Shortcut: `Ctrl+F` / `Cmd+F`
- Global `keydown` listener registered in `App.tsx` via the `SaugatSearchProvider`
- `Ctrl+F` opens the search if closed, **closes it if already open** (toggle behavior)
- `Escape` also closes it
- `e.preventDefault()` to block browser's native find

### 6. Desktop Header: Search Icon Button
In `DesktopSuiteLanding.tsx`, add a small gold-themed search icon button in the right-side header actions, positioned before the News toggle button. Clicking it opens SAUGAT SEARCH.

### 7. Remove Old Bottom-Left Search
- `SuiteDashboardContent.tsx`: Remove the fixed bottom-left `MasterSearchButton` div (lines 90-93)
- `SuiteQuickActionsBar.tsx`: Remove `MasterSearchButton` import if used in desktop variant

### 8. Fix Recent Search Clicks
In the new `SaugatSearch.tsx`, the drag-to-scroll logic will be fixed:
- `onPointerDown`: Record start coordinates, set `isDragging = false`
- `onPointerMove`: Only set `isDragging = true` if distance > 5px, then capture pointer
- `onClick` on chip: Only fire `handleRecentClick` if `isDragging` was never set to true

### 9. `App.tsx` Changes
- Wrap the app in `SaugatSearchProvider`
- Render `<SaugatSearch />` globally (inside the provider, outside Routes)

---

## Files Summary

| File | Action |
|------|--------|
| `src/contexts/SaugatSearchContext.tsx` | **Create** -- context with isOpen/open/close/toggle + Ctrl+F listener |
| `src/components/suite/SaugatSearch.tsx` | **Create** -- full overlay component with yellow betting theme |
| `src/index.css` | **Edit** -- add saugat-search keyframes |
| `src/App.tsx` | **Edit** -- wrap in SaugatSearchProvider, render SaugatSearch globally |
| `src/components/suite/DesktopSuiteLanding.tsx` | **Edit** -- add gold search icon button in header |
| `src/components/suite/SuiteDashboardContent.tsx` | **Edit** -- remove bottom-left MasterSearchButton |

