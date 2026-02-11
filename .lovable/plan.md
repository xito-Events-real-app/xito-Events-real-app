

## Restore Google Keep-Style Notes with Grid Layout

### What Went Wrong
The current page uses dark backgrounds with faint colored left borders instead of the original **bright colored note backgrounds** (yellow, green, pink, blue, orange) like Google Keep. Notes are also displayed in a single vertical list, wasting screen space.

### Changes

**File: `src/pages/BenzoKeepPage.tsx` (rewrite)**

1. **Restore Google Keep colored backgrounds**
   - Use the original color scheme from `UnassignedBenzoKeepDialog.tsx`:
     - Yellow: `bg-yellow-100 border-yellow-300`
     - Green: `bg-green-100 border-green-300`
     - Pink: `bg-pink-100 border-pink-300`
     - Blue: `bg-blue-100 border-blue-300`
     - Orange: `bg-orange-100 border-orange-300`
   - Text stays dark (`text-gray-800`) on these light backgrounds

2. **Grid layout to show 9+ notes at once**
   - Use a responsive CSS grid: `grid-cols-2 sm:grid-cols-3` (3 columns on tablet/desktop, 2 on mobile)
   - Each note card is compact: 3-4 lines of content visible with `line-clamp-3`
   - Small text size and tight padding to maximize density
   - Star icon, date, and quick action icons on each card

3. **Click to expand inline**
   - Clicking a note card expands it to show full content, Xito Search, and action buttons (Assign, Edit, Delete)
   - Expanded card stays in-grid but takes full width or shows a modal-like overlay

4. **Full Screen view preserved**
   - "Full Screen" button on expanded cards opens the dedicated full-width detail overlay (keep existing full-screen logic but with light colored backgrounds instead of dark)

5. **Keep all existing features**
   - Stats bar (make it more compact -- single row)
   - Tabs (All / Starred) in header
   - Add Note form
   - Star toggle, Edit, Delete, Assign to Client
   - Color picker when adding/editing

### Visual Layout (Desktop - 3 columns)

```text
+--[yellow bg]--------+  +--[pink bg]----------+  +--[blue bg]----------+
| * Note content...   |  | Note content here... |  | * Another note...   |
|   truncated to 3    |  |   truncated to 3     |  |   truncated to 3    |
|   lines max         |  |   lines max          |  |   lines max         |
| [date]   [star][...] | | [date]   [star][...] |  | [date]   [star][...] |
+---------------------+  +----------------------+  +----------------------+
+--[green bg]---------+  +--[orange bg]---------+  +--[yellow bg]---------+
| Note content...     |  | Note content...      |  | Note content...      |
|   ...               |  |   ...                |  |   ...                |
| [date]   [star][...] | | [date]   [star][...] |  | [date]   [star][...] |
+---------------------+  +----------------------+  +----------------------+
+--[blue bg]----------+  +--[pink bg]-----------+  +--[green bg]----------+
| Note content...     |  | Note content...      |  | Note content...      |
| [date]   [star][...] | | [date]   [star][...] |  | [date]   [star][...] |
+---------------------+  +----------------------+  +----------------------+
```

### Technical Details

| Area | Detail |
|------|--------|
| Colors | Restore `bg-yellow-100`, `bg-green-100`, `bg-pink-100`, `bg-blue-100`, `bg-orange-100` with matching borders |
| Grid | `grid grid-cols-2 sm:grid-cols-3 gap-3` for 9+ notes visible |
| Card size | `p-3`, `text-sm`, `line-clamp-3` for compact display |
| Expand | Click card to show full content + actions in an overlay/modal |
| Full screen | Keep existing full-screen overlay but with light colored background |
| Page background | Keep the dark gradient (`from-slate-900`) as the page background -- the note cards pop against it with their bright colors |
| Stats bar | Compress to a single compact row |
| Header | Keep sticky header with tabs and add button |

### Files to Change

| File | Change |
|------|--------|
| `src/pages/BenzoKeepPage.tsx` | Rewrite note cards to use Google Keep colors, grid layout, compact cards, expand/fullscreen |

No other files need changes -- routing and navigation are already set up.
