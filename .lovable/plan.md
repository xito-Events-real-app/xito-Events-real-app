

# Add Freelancer Availability Stats to Crew Column Headers (Same Row)

## Layout

Each column header will show stats inline on a single row:

```
55 PB 5/60
```

- **55** = remaining freelancers (bold, prominent)
- **PB** = existing short code
- **5/60** = assigned/total (small, muted)

## File Changed

**`src/components/suite/AllClientsCrewTable.tsx`**

### 1. Add `columnStats` useMemo (after `columnWidths`, ~line 528)

Compute per-column stats using existing `freelancers` state and `filteredRows`:

```typescript
const columnStats = useMemo(() => {
  const stats: Record<string, { total: number; assigned: number; remaining: number }> = {};
  for (const col of CREW_COLUMNS) {
    const rolePool = getFilteredFreelancersByRole(freelancers, col.field);
    const total = rolePool.length;
    const assignedNames = new Set<string>();
    for (const row of filteredRows) {
      const val = (row[col.field] as string)?.trim();
      if (val) assignedNames.add(val.toUpperCase());
    }
    const assigned = assignedNames.size;
    stats[col.field] = { total, assigned, remaining: total - assigned };
  }
  return stats;
}, [freelancers, filteredRows]);
```

### 2. Update desktop header cells (lines 1004-1012)

Replace the current `{col.short}` with an inline layout:

```tsx
{CREW_COLUMNS.map(col => {
  const s = columnStats[col.field];
  return (
    <th key={col.field}
      className={cn("text-xs font-bold px-1 py-2.5 text-center border-r last:border-r-0", GROUP_STYLES[col.group])}
      style={{ width: `${columnWidths[col.field]}px`, minWidth: `${columnWidths[col.field]}px` }}>
      <span className="flex items-center justify-center gap-0.5 whitespace-nowrap">
        <span className="font-black text-sm">{s?.remaining ?? ''}</span>
        <span className="font-bold text-[10px]">{col.short}</span>
        <span className="text-[8px] opacity-50">{s?.assigned}/{s?.total}</span>
      </span>
    </th>
  );
})}
```

The minimum column width of 55px is sufficient. No new dependencies or database changes needed.

