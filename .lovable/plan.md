

# Fix: Column Stats Should Count Assignments (Rows), Not Unique Freelancers

## Current Behavior (Wrong)

The stats use `getFilteredFreelancersByRole` to get the **freelancer pool size** as `total`, and count **unique assigned names** as `assigned`. This answers "how many freelancers are available" -- not what you want.

## Correct Behavior

- **16 (total)** = total number of rows in `filteredRows` (i.e., total assignment slots for that column)
- **4 (assigned)** = rows where that column is filled (non-empty value)
- **12 (remaining)** = rows where that column is still empty (16 - 4)

## Change

**File: `src/components/suite/AllClientsCrewTable.tsx`** (lines 530-544)

Replace the `columnStats` useMemo with row-counting logic:

```typescript
const columnStats = useMemo(() => {
  const stats: Record<string, { total: number; assigned: number; remaining: number }> = {};
  for (const col of CREW_COLUMNS) {
    const total = filteredRows.length;
    let assigned = 0;
    for (const row of filteredRows) {
      const val = (row[col.field] as string)?.trim();
      if (val) assigned++;
    }
    stats[col.field] = { total, assigned, remaining: total - assigned };
  }
  return stats;
}, [filteredRows]);
```

Key differences:
- `total` = `filteredRows.length` (number of assignment rows), not freelancer pool size
- `assigned` = count of rows with a non-empty value in that column, not unique names
- `remaining` = unassigned slots
- Removes dependency on `freelancers` and `getFilteredFreelancersByRole`

No other file changes needed.

