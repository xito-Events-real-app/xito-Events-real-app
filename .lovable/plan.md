

## Plan: Use Majority Month for Client Folder Grouping

### Problem
A client like Shakti Neupane has events across multiple months (e.g., 3 events in Falgun, 1 in Chaitra). The current logic adds the client to **every** month group, creating duplicate folders. This also breaks the Album section because it constructs the S3 prefix using per-assignment year/month — if the photos were uploaded under one month folder but the album looks up a different month, it finds nothing.

### Solution: Majority-Month Logic
Instead of adding a client to every unique month group, determine **one** canonical month-year by majority vote:
1. Count occurrences of each `year-month` combo across all events
2. Pick the one with the highest count
3. If tied, pick the one that appears first (earliest index in the event list)

This affects **two places**:

### Files to Modify

**1. `src/lib/xito-drive-utils.ts` — `buildMonthYearGroups()`**

Replace the current loop (lines 84-116) that adds the client to every month group. New logic:

```text
For each client:
  1. Parse years[], months[] from newline-separated fields
  2. Count frequency of each "year-month" combo
  3. Pick the combo with max frequency (ties → first occurrence)
  4. Add client to ONLY that one group
```

**2. `src/components/client-detail/AlbumSection.tsx` — tabs `useMemo`**

Currently each assignment's own `eventYear`/`eventMonth` is used to build the S3 prefix. This means events in different months get different prefixes, but the actual files live under the majority-month folder.

Fix: compute the majority month once from all assignments for this client, then use that single `yearMonth` for ALL tabs.

```text
Before building tabs:
  1. Count frequency of each year-month across all assignments
  2. Determine majorityYearMonth (same logic as xito-drive-utils)
  3. Use majorityYearMonth for every tab's s3Prefix instead of per-assignment month
```

### Technical Details

Majority month helper (shared or inline):
```typescript
function getMajorityYearMonth(years: string[], months: string[]): string {
  const freq = new Map<string, number>();
  const order: string[] = [];
  for (let i = 0; i < Math.max(years.length, months.length, 1); i++) {
    const y = String(parseInt(years[i] || years[0] || "0"));
    const m = String(parseInt(months[i] || months[0] || "0")).padStart(2, "0");
    const key = `${y}-${m}`;
    if (!freq.has(key)) order.push(key);
    freq.set(key, (freq.get(key) || 0) + 1);
  }
  let best = order[0] || "0-00";
  let bestCount = 0;
  for (const k of order) {
    if ((freq.get(k) || 0) > bestCount) {
      best = k;
      bestCount = freq.get(k) || 0;
    }
  }
  return best;
}
```

This ensures each client appears in exactly one folder in XITO DRIVE, and the Album section looks up the correct S3 path matching where files were actually uploaded.

