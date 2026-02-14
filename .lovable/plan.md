

# Clean White "Not Required" Cells with Visual Merging

## What Changes

"Not Required" cells will become completely clean white -- no inner boxes, no dashes, no text, no borders between adjacent not-required cells. When multiple consecutive cells are all "Not Required", they visually merge into one seamless white area.

## Technical Changes

### File: `src/components/suite/AllClientsCrewTable.tsx`

**1. CrewCell component (line ~794)** -- Add a new prop `isNextRequired` to know whether to show the right border:

- Change the not-required return block (lines 827-837) to render a completely empty white `<td>` with no inner div, no text, no dash
- Remove `border-r` when the next cell is also not required (seamless merge)
- Remove padding and inner box so it's just flat white space

```
// Before:
<td className="px-1 py-1.5 border-r border-gray-100">
  <div className="... bg-white border border-gray-200 text-gray-400">—</div>
</td>

// After:
<td className="py-1.5 bg-white"  // no px, no border-r if next is also not-required
    style={{ width, minWidth }}
/>
```

**2. Row rendering (line ~686)** -- Pass `isNextRequired` to each CrewCell by checking the next column's requirement status:

```typescript
{CREW_COLUMNS.map((col, idx) => {
  const isRequired = ...;
  const nextCol = CREW_COLUMNS[idx + 1];
  const isNextRequired = nextCol
    ? (reqCodes.length === 0 || reqCodes.includes(nextCol.short))
    : true; // last column always has border
  return (
    <CrewCell ... isRequired={isRequired} isNextRequired={isNextRequired} />
  );
})}
```

**3. Expanded card view (line ~540)** -- Hide not-required roles entirely from the mobile/expanded card grid instead of showing a white box. Simply skip rendering them with `if (!isReq) return null;` so only required roles appear.

## Result

- Desktop compact table: Not-required cells are flat white empty space, merging seamlessly when adjacent
- Mobile/expanded cards: Not-required roles are hidden entirely, showing only relevant crew slots
- Required but empty cells still show the colored combobox for assignment

## Files to Modify

1. `src/components/suite/AllClientsCrewTable.tsx`

