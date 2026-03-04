

# Fix: Duplicate File Rows from Concurrent `ensureFileRowsForMonth` Calls

## Problem Confirmed

All 7 duplicates belong to **PRASANSHA ADHIKARI** (`2026-01-25T13:22:14.887Z`). Two batches were inserted 86 seconds apart (21:34:18 and 21:35:44). The second call queried existing rows before the first batch's insert was visible, so it saw no existing keys and re-inserted identical rows.

No other clients are affected — yet. But this will happen again for any future month loads.

## Root Cause

`ensureFileRowsForMonth` has no concurrency guard. When the realtime subscription fires (because new rows were just inserted), it calls `loadFiles()`, and if React re-renders trigger the effect again, a second `ensureFileRowsForMonth` runs concurrently with overlapping dedup queries.

## Fix (3 parts)

### Part 1: Add concurrency lock to `ensureFileRowsForMonth`

**File: `src/lib/files-api.ts`**

Add a module-level promise lock so only one `ensureFileRowsForMonth` can run at a time:

```typescript
let _ensureLock: Promise<void> | null = null;

export async function ensureFileRowsForMonth(eventYear, eventMonth) {
  if (_ensureLock) await _ensureLock;
  let resolve: () => void;
  _ensureLock = new Promise(r => { resolve = r; });
  try {
    // ... existing logic (unchanged) ...
  } finally {
    resolve!();
    _ensureLock = null;
  }
}
```

### Part 2: Debounce the realtime handler in `useFilesManagement`

**File: `src/hooks/useFilesManagement.ts`**

The realtime subscription currently calls `loadFiles()` on every change event. When `ensureFileRowsForMonth` inserts 10 rows, that fires 10 realtime events. Add a simple debounce (500ms) to the handler:

```typescript
let realtimeTimer: ReturnType<typeof setTimeout>;
// In the realtime handler:
.on("postgres_changes", { ... }, () => {
  clearTimeout(realtimeTimer);
  realtimeTimer = setTimeout(() => {
    if (!cancelled) loadFiles();
  }, 500);
})
```

### Part 3: Delete existing duplicates

**Database cleanup** — delete the later duplicate for each unique combination (keep the earliest `created_at`):

```sql
DELETE FROM files_management 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY registered_date_time_ad, event_name, freelancer_type, freelancer_name 
      ORDER BY created_at ASC
    ) as rn
    FROM files_management 
    WHERE deleted_or_not = false
  ) t WHERE rn > 1
);
```

This deletes exactly the 7 duplicate rows for PRASANSHA ADHIKARI (the second batch from 21:35:44).

## Risk Assessment

| Change | What could break | Mitigation |
|--------|-----------------|------------|
| Concurrency lock | If `ensureFileRowsForMonth` throws, lock could hang | `finally` block always releases the lock |
| Debounce realtime | 500ms delay before UI updates after external edits | Acceptable tradeoff; local optimistic updates are instant |
| Delete duplicates | Could delete rows with user edits | Query keeps the earliest row (which has the original data); the second batch was inserted 86s later with no user edits |

## Files Changed
1. `src/lib/files-api.ts` — Add concurrency lock around `ensureFileRowsForMonth`
2. `src/hooks/useFilesManagement.ts` — Debounce realtime handler
3. Database — Delete 7 duplicate rows

