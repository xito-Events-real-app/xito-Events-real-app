

## Editor Name Filter — Video Edit Tracker + Pipeline

### What's changing

1. **Pipeline (WtnPipelineView)**: Add an "Editors" filter section below the existing "Edit Types" rail on the right sidebar (desktop) and below the edit type strip (mobile). Shows only editors who have rows assigned in the current stage/view. Clicking filters to show only that editor's rows.

2. **Main page (DesktopVideoEditTracker)**: Add editor name filter buttons in the filter bar — pill/button style showing editors present in the current tab's rows. Clicking filters by that editor.

3. **Fix editor name truncation**: The editor `SelectTrigger` currently uses `w-36` which truncates long names. Widen it and ensure full name display.

### Technical Details

**New state in both components**: `filterEditor: string | null`

**Derive active editors per stage** (same pattern as `editTypes`):
```typescript
const activeEditors = useMemo(() => {
  const names = new Set<string>();
  // collect editor names from current stage rows (unfiltered)
  return Array.from(names).sort();
}, [activeTab, rowsByStatus]);
```

**Filter integration**: Add `filterEditor` to `applyFiltersAndSort` in both files — filter rows where `row.editor === filterEditor`.

### Files Changed

**1. `src/components/video-edit/DesktopVideoEditTracker.tsx`**
- Add `filterEditor` state
- Compute `activeEditors` from current tab's unfiltered rows (editors with at least 1 assigned row)
- Add editor filter to `applyFiltersAndSort` call
- Add editor pill buttons in the filter bar (after sort buttons, before Clear All)
- Widen editor `SelectTrigger` from `w-36` to `w-44` and remove truncation
- Include `filterEditor` in `clearAll` and `hasFilters`

**2. `src/components/video-edit/WtnPipelineView.tsx`**
- Add `filterEditor` state
- Compute `activeEditors` from current stage's unfiltered rows
- Add editor filter to the filtering logic
- Desktop: Add "Editors" section below "Edit Types" in the right sidebar rail — same button style with different colors (teal/indigo palette)
- Mobile: Add editor buttons below edit type strip
- Include in `clearAll` and `hasFilters`

### Editor Button Style (both views)
Colored pill buttons matching the edit type style but with a distinct teal/indigo palette to differentiate. Shows editor name + count of rows in current stage.

