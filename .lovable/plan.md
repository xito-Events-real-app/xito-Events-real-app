

## Redesign Unassigned Benzo Keep as Full-Screen Page with Finance-Style Graphics

### Current Problems
1. **Scroll is broken** because the Dialog has `max-h-[85vh]` and nested `ScrollArea` with `max-h-[50vh]` -- content overflows but can't be scrolled
2. Notes are cramped inside a small dialog popup
3. Visual style is plain white, not matching the dark premium look of the Finance Module

### Solution: Full-Screen Page with Dark Theme

Replace the dialog-based view with a **full-screen dedicated page** (`/benzo-keep`) using the same dark gradient theme as the Finance Manager (`bg-gradient-to-br from-slate-900 via-violet-950/20 to-slate-900`).

### Layout and Features

**Header (sticky)**
- Title "Benzo Keep" with note count
- Tabs: "All Notes" | "Starred"
- "Add Note" button
- Back navigation

**Stats Bar** (Finance-style gradient cards)
- Total Notes count (violet theme)
- Starred Notes count (yellow theme)  
- Recent (last 7 days) count (emerald theme)
- Color distribution (amber theme)

**Notes Grid**
- Each note shows as a **collapsed card** with:
  - First 2 lines of content visible (line-clamp-2)
  - Marker color as a left border accent
  - Star icon, date, and action buttons visible
  - Subtle gradient background matching Finance cards (`bg-slate-800/50 border-slate-700/50`)
- **Click to expand** the note inline (accordion-style) showing full content + Xito Search
- **"Open Full Screen" button** on each card opens a full-width detail view of that single note

**Sorting**: Starred first, then by `lastUpdated` descending (already implemented in hook)

### Technical Changes

| File | Change |
|------|--------|
| `src/pages/BenzoKeepPage.tsx` | **New file** -- full-screen page with dark theme, stats bar, collapsible note cards, expand/fullscreen |
| `src/App.tsx` | Add route `/benzo-keep` pointing to the new page |
| `src/components/suite/SuiteBenzoKeepSection.tsx` | Change "Unassigned" button to navigate to `/benzo-keep` instead of opening dialog |
| `src/components/suite/UnassignedBenzoKeepDialog.tsx` | Keep file but it will no longer be the primary view; the page replaces it |

### Visual Design (Finance-Module Inspired)

- **Background**: `bg-gradient-to-br from-slate-900 via-violet-950/20 to-slate-900`
- **Cards**: `bg-slate-800/50 border-slate-700/50` with colored left border for marker color
- **Stats cards**: Gradient cards like Finance (violet, yellow, emerald, amber accents)
- **Text**: White headings, slate-400 secondary text, colored accents for dates
- **Star icon**: Yellow fill when starred, ghost when not
- **Expanded note**: Shows full content with highlighted dates, Xito Search collapsible, and action buttons
- **Scrolling**: Native page scroll -- no dialog constraints

### Collapsed Note Card Structure
```
+--[violet border]--------------------------------------------+
| [Star icon]  First 2 lines of note content...      [date]   |
|              ...truncated                          [actions] |
+-------------------------------------------------------------+
```

### Expanded Note Card Structure
```
+--[violet border]--------------------------------------------+
| [Star icon]  Full note content with highlighted dates        |
|              All text visible, no truncation                 |
|                                                              |
|  [Xito Search - collapsible]                                |
|                                                              |
|  [Assign to Client]  [Edit]  [Delete]        [Collapse]    |
+-------------------------------------------------------------+
```

