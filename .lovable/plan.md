

## Merge Full Video + Highlights into Combined Rows in Video Edit Tracker

### Concept

When both "Full Video" and "Highlights" rows exist for the same client+event (same `registeredDateTimeAD` + `eventName`), display them as a single merged row showing "Full Video + Highlights" in the Edit Type column. A small split button lets users break them into individual rows, and a merge button appears on separated rows to combine them back.

### Approach — UI-only merging (no DB changes)

This is purely a **display-level** merge. Both DB rows remain separate. The hook groups them visually and operations (move to stage, assign editor, etc.) apply to **both** underlying rows simultaneously.

### Changes

**1. `src/hooks/useVideoEditTracker.ts` — Add merge/split state + grouped rows**

- Add `mergedKeys` state: `Set<string>` where key = `${registeredDateTimeAD}||${eventName}`. Tracks which pairs are currently displayed as merged. Default: ALL pairs with both Full Video + Highlights start merged.
- New `splitRow(key)` and `mergeRow(key)` functions toggle the key in/out of the set.
- New `groupedRowsByStatus` computed property: for each stage, find pairs where both Full Video and Highlights exist for the same client+event. If the pair key is in `mergedKeys`, replace the two rows with one synthetic "merged" row that carries both IDs.
- Export a new `DisplayRow` type extending `VideoEditRow` with optional `mergedIds: string[]` (array of the two real IDs) and `isMerged: boolean`.

**2. `src/hooks/useVideoEditTracker.ts` — Wrapped operations for merged rows**

- `updateField`: if row has `mergedIds`, apply update to ALL IDs in the array
- `pushToStatus`: if row has `mergedIds`, move ALL IDs together
- Merged row displays: `editType = "Full Video + Highlights"`, takes urgency/editor from the Full Video row

**3. `src/components/video-edit/DesktopVideoEditTracker.tsx` — Render merge/split buttons**

- In the Edit Type column, if `row.isMerged`: show "Full Video + Highlights" badge + a small "Split" icon button (Ungroup icon)
- If row is an unmerged Full Video or Highlights that has a matching partner in the same stage: show a small "Merge" icon button (Group icon)
- Split/merge buttons call `splitRow`/`mergeRow` from the hook

**4. `src/components/video-edit/MobileVideoEditTracker.tsx` — Same merge/split UI for mobile cards**

### Merge key logic
```text
key = `${row.registeredDateTimeAD}||${row.eventName}`

A pair is mergeable when:
- Same key
- Same stage (videoEditStatus)  
- One has editType "Full Video", other has "Highlights"
```

### Files changed
1. `src/hooks/useVideoEditTracker.ts` — merge state, grouped rows, wrapped operations
2. `src/components/video-edit/DesktopVideoEditTracker.tsx` — split/merge buttons in Edit Type column
3. `src/components/video-edit/MobileVideoEditTracker.tsx` — split/merge buttons in mobile cards

