

## Changes to All Clients Page Header

### What's changing

1. **Remove "Preview Crew Link" button** and its associated crew preview dialog (lines 560-566, 1363-1371), the `showCrewPreview` state (line 121), and the `LazyCrewSchedule` lazy import (line 76).

2. **Remove "Lock Empty Slots" button** and all related code: the `isLockingSlots` state (line 119), and the entire button block (lines 587-630).

3. **Add month navigation arrows** — left/right arrow buttons flanking the month `<Select>` dropdown. Left arrow decreases the month (wrapping to month 12 of previous year), right arrow increases (wrapping to month 1 of next year).

### Files Changed

**`src/components/suite/AllClientsCrewTable.tsx`**
- Remove `LazyCrewSchedule` import and `lazy`/`Suspense` if no longer needed
- Remove `showCrewPreview` state
- Remove `isLockingSlots` state
- Remove `ExternalLink`, `UserCog` icon imports (if unused elsewhere)
- Remove "Preview Crew Link" button (lines 560-566)
- Remove "Lock Empty Slots" button block (lines 585-630)
- Remove crew preview `<Dialog>` (lines 1363-1371)
- Add `ChevronRight` to lucide imports
- Wrap month `<Select>` with left (`ChevronLeft`) and right (`ChevronRight`) arrow buttons that decrement/increment `selectedMonth` with year wrap-around

### Month Arrow Logic
```typescript
const handlePrevMonth = () => {
  const m = parseInt(selectedMonth);
  if (m <= 1) { setSelectedMonth("12"); setSelectedYear(String(parseInt(selectedYear) - 1)); }
  else setSelectedMonth(String(m - 1));
};
const handleNextMonth = () => {
  const m = parseInt(selectedMonth);
  if (m >= 12) { setSelectedMonth("1"); setSelectedYear(String(parseInt(selectedYear) + 1)); }
  else setSelectedMonth(String(m + 1));
};
```

