

## Fix: Fetch ALL Unassigned Notes from ALL Rows in AM Column

### Root Cause

From the edge function logs, the data in column AM is distributed across multiple rows:
- **Row 3 (AM3)**: 1 note (SAILESH & ANJALI)
- **Row 4 (AM4)**: 1 note (MAYA SHRESTHA)
- **Row 10 (AM10)**: 3 notes (date converter, lagaune wala, Srijana sharma)

But the current code has a `return parsed;` inside the loop -- it **returns immediately** after finding the first valid row, so only 1 note is returned instead of all 5.

### Fix

**File: `supabase/functions/google-sheets/index.ts` (lines 296-314)**

Change the loop to **collect** notes from all rows into a single array, then return the combined result:

```typescript
// Collect notes from ALL rows
const allNotes: UnassignedBenzoNote[] = [];

for (let i = 0; i < data.values.length; i++) {
  const cellValue = data.values[i]?.[0];
  if (cellValue) {
    try {
      const parsed = JSON.parse(cellValue);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`[UNASSIGNED NOTES] Found ${parsed.length} notes in row ${i + 2}`);
        allNotes.push(...parsed);
      }
    } catch (e) {
      console.log(`[UNASSIGNED NOTES] Row ${i + 2} JSON parse failed:`, e);
    }
  }
}

console.log(`[UNASSIGNED NOTES] Total notes collected: ${allNotes.length}`);
return allNotes;
```

This is a one-file, ~10-line change. The hook and UI already have star/sort/tabs support from the previous update -- they just need data.

### Save Fix

The `saveUnassignedBenzoKeepNote` and `deleteUnassignedBenzoKeepNote` functions also call `getUnassignedBenzoKeepNotes` first, then save the updated array back to **AM2 only**. Since notes are spread across multiple rows, saving back to AM2 will consolidate them and the old rows will become stale duplicates.

To fix this properly:
1. After collecting all notes, save the consolidated array back to AM2
2. Clear the other rows (AM3:AM10) so notes don't duplicate on next fetch

This means updating `saveUnassignedBenzoKeepNote` to also clear AM3:AM10 after writing to AM2.

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/google-sheets/index.ts` | Fix fetch loop to collect ALL notes; consolidate saves to AM2 and clear AM3:AM10 |

No frontend changes needed -- the hook and UI already support star, tabs, and date sorting.

