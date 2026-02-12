

# Fix ALL CLIENTS: Instant Load + Filter Fix

## Problems Found

### 1. Filter Broken -- Month format mismatch
The actual sheet data stores `eventMonth` as a **number string** (e.g., `"10"`, `"11"`), NOT as a name like `"MAGH"`. The current filter converts the selected month to `"MAGH"` and compares it to `"10"` -- they never match, so 0 results always show.

```text
Current (broken):
  selectedMonth = "10"
  NEPALI_MONTHS[10] = "MAGH"
  a.eventMonth = "10"
  "10" === "MAGH"  -->  FALSE (never matches!)
```

**Fix**: Compare `eventMonth` directly to `selectedMonth` as strings, since both are number strings.

### 2. Slow Load -- Syncs on every open
Every time the view opens, it calls `fullSyncFreelancerAssignments()` which is a heavy write operation (copies booked clients into the freelancers sheet), THEN reads the data. This causes a long wait.

**Fix**: Load data from the sheet immediately first (instant read), show it, then sync in the background. Cache the last-loaded assignments in `sessionStorage` so reopening the view is instant.

---

## Technical Details

### File: `src/components/suite/AllClientsCrewTable.tsx`

**Filter fix (line 107-111):**
Change the month comparison from name-based to direct number comparison:
```typescript
// Before (broken):
const monthName = NEPALI_MONTHS[parseInt(selectedMonth)] || "";
const monthMatch = a.eventMonth?.toUpperCase() === monthName;

// After (fixed):
const monthMatch = a.eventMonth === selectedMonth;
```
Also compare year directly: `a.eventYear === selectedYear` (this already works).

**Instant load with cache:**
1. On mount, immediately load from `sessionStorage` cache key `crew_assignments_cache` if available -- this renders the table instantly
2. Then call `loadData()` (read-only fetch from sheet) to get fresh data and update cache
3. Sync (`fullSyncFreelancerAssignments`) runs in the background AFTER data is displayed -- it no longer blocks the UI
4. The 30-minute auto-sync continues in the background
5. Manual "Sync Clients" button still triggers a full sync + reload

Flow:
```text
Open ALL CLIENTS
  -> Show cached data instantly (if available)
  -> Fetch fresh data from sheet (non-blocking)
  -> Background sync every 30 min (non-blocking)
```

### Changes Summary

| File | Change |
|------|--------|
| `src/components/suite/AllClientsCrewTable.tsx` | Fix month filter comparison; add sessionStorage cache for instant load; make sync non-blocking |

