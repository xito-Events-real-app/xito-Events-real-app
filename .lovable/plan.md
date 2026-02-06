
## Fix: Mobile Home Tab Width Overflow

### Problem
The Home tab has horizontal overflow causing content to be cut off on the right side, while other tabs (Handlers, Modules, News) display correctly. The issue is specifically in the Home tab content.

### Root Cause Analysis
After analyzing the code:

1. **SuiteQuickActionsBar**: The buttons use `w-full` but the container grid doesn't prevent content from expanding
2. **MasterSearchButton / MasterSyncButton**: These buttons may have internal content that forces minimum widths
3. **TodayEventsHero**: The event cards have complex content that may overflow
4. **Missing overflow constraints**: The grids and containers need explicit `overflow-hidden` to prevent child content from breaking out

### Solution

**File 1: `src/components/suite/MobileSuiteLanding.tsx`**

Add `overflow-hidden` to all grid containers in `HomeTabContent`:

| Line | Change |
|------|--------|
| 149 | Add `overflow-hidden` to main container |
| 154 | Add `overflow-hidden` to Search/Sync grid |

```tsx
// Line 149 - Main container
<div className="px-2 py-3 space-y-2.5 pb-24 w-full max-w-full overflow-hidden box-border">

// Line 154 - Search/Sync grid  
<div className="grid grid-cols-2 gap-2 w-full max-w-full overflow-hidden">
```

**File 2: `src/components/suite/SuiteQuickActionsBar.tsx`**

Add `overflow-hidden` to the mobile buttons grid and ensure buttons shrink properly:

| Line | Change |
|------|--------|
| 72 | Add `overflow-hidden` to grid container |
| 73-87 | Add `min-w-0` and `overflow-hidden` to buttons |

```tsx
// Line 72
<div className="grid grid-cols-2 gap-1.5 w-full max-w-full overflow-hidden">
  <Button className="h-9 w-full min-w-0 overflow-hidden ...">
```

**File 3: `src/components/suite/MasterSearchButton.tsx`**

Ensure collapsed button doesn't force minimum width:

| Line | Change |
|------|--------|
| 304-317 | Remove any min-width constraints, add `overflow-hidden` |

```tsx
// Line 304-317 - Collapsed button
<button
  onClick={() => setIsExpanded(true)}
  className={cn(
    "w-full min-w-0 h-9 rounded-full font-semibold flex items-center justify-center gap-1.5 px-2 overflow-hidden",
    ...
  )}
>
```

**File 4: `src/components/suite/MasterSyncButton.tsx`**

Same fix - ensure button doesn't force minimum width:

| Line | Change |
|------|--------|
| 180-192 | Add `min-w-0 overflow-hidden` to button |

```tsx
// Line 177-192
<Button
  onClick={handleMasterSync}
  disabled={isSyncing}
  className={cn(
    "h-9 w-full min-w-0 overflow-hidden rounded-full font-semibold gap-1 px-2 transition-all text-[11px]",
    ...
  )}
>
```

**File 5: `src/components/suite/TodayEventsHero.tsx`**

Add `overflow-hidden` to prevent event cards from overflowing:

| Line | Change |
|------|--------|
| 280 | Add `overflow-hidden` to main container |
| 288 | Add `overflow-hidden` to content wrapper |
| 314 | Add `overflow-hidden` to scrollable container |

```tsx
// Line ~280 - Main container wrapper
<div className={cn(
  "relative bg-white rounded-xl border shadow-sm overflow-hidden", // Add overflow-hidden
  ...
)}>

// Line ~314 - Events list container
<div className="max-h-[180px] md:max-h-[400px] overflow-y-auto overflow-x-hidden pr-1 ...">
```

### Summary of Changes

| File | Key Fix |
|------|---------|
| `MobileSuiteLanding.tsx` | Add `overflow-hidden` to container and grids |
| `SuiteQuickActionsBar.tsx` | Add `overflow-hidden` to grid, `min-w-0` to buttons |
| `MasterSearchButton.tsx` | Add `min-w-0 overflow-hidden` to collapsed button |
| `MasterSyncButton.tsx` | Add `min-w-0 overflow-hidden` to button |
| `TodayEventsHero.tsx` | Add `overflow-hidden` and `overflow-x-hidden` to containers |

### Why This Works

The key issue is CSS flexbox/grid behavior:
- `w-full` makes an element try to fill 100% of parent width
- But if child content (text, icons) has inherent minimum width, it can push the element beyond its container
- `min-w-0` tells the element it can shrink below its content's natural size
- `overflow-hidden` clips any content that still overflows
- `truncate` on text ensures long text gets cut off with ellipsis

By adding these constraints at every level (container → grid → button → text), we ensure nothing can overflow the viewport.
