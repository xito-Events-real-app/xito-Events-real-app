

# Fix: Crew Schedule Calendar Showing Nothing for Partial Name URLs

## Problem

After implementing exact-match filtering in the Crew Schedule page, old links that use only the first name (e.g., `/crew-schedule/SAFAL` instead of `/crew-schedule/SAFAL%20KC`) now return zero results because the exact-match filter correctly rejects "SAFAL" since no assignment has that as a standalone name.

The link generator in `AllClientsCrewTable.tsx` was fixed to use full names, but existing shared links (WhatsApp messages, bookmarks) still use the old first-name-only format.

## Solution

Add a **smart fallback** in `src/pages/CrewSchedule.tsx`: if the exact-match filter returns zero results, attempt a "starts-with" match as a fallback. This way:

- `/crew-schedule/SAFAL%20KC` --> exact match --> finds "SAFAL KC" assignments (correct)
- `/crew-schedule/SAFAL` --> exact match fails --> starts-with fallback --> finds "SAFAL KC" but NOT "AJAY ADHIKARI (SAFAL)" (correct)
- `/crew-schedule/AJAY%20ADHIKARI%20(SAFAL)` --> exact match --> finds only their assignments (correct)

## Technical Details

**File: `src/pages/CrewSchedule.tsx` (lines 67-75)**

After the exact-match filter, add a fallback:

```typescript
if (!assignRes.error && assignRes.data) {
  const target = decodedName.trim().toLowerCase();
  
  // Step 1: Try exact match first
  const exactFiltered = assignRes.data.filter(row =>
    ROLE_COLUMNS.some(col => {
      const val = ((row as any)[col] || '').toString();
      return val.split('\n').some(entry => entry.trim().toLowerCase() === target);
    })
  );
  
  // Step 2: If no exact matches, try "starts with" as fallback for old partial-name links
  if (exactFiltered.length === 0) {
    const startsWithFiltered = assignRes.data.filter(row =>
      ROLE_COLUMNS.some(col => {
        const val = ((row as any)[col] || '').toString();
        return val.split('\n').some(entry => entry.trim().toLowerCase().startsWith(target));
      })
    );
    setAssignments(startsWithFiltered as AssignmentRow[]);
  } else {
    setAssignments(exactFiltered as AssignmentRow[]);
  }
}
```

This is backward-compatible with old links while still preventing the "AJAY ADHIKARI (SAFAL)" false positive since "SAFAL" does not start-with match "AJAY ADHIKARI (SAFAL)".
