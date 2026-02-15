

# Fix: Freelancer Calendar Showing Duplicate Events Due to Partial Name Matching

## Problem

When viewing the Crew Schedule calendar for "SAFAL KC", the query uses:
```
ilike.%SAFAL KC%
```
This matches any cell **containing** "SAFAL KC" as a substring. While this works in most cases, the real problem is the reverse -- when "SAFAL" alone is searched, it would match "AJAY ADHIKARI (SAFAL)" too. More importantly, the current `ilike` pattern can match partial names embedded in other names.

The root cause is in `src/pages/CrewSchedule.tsx` at line 59:
```typescript
const orFilter = ROLE_COLUMNS.map(col => `${col}.ilike.%${decodedName}%`).join(",");
```

Since freelancer names in assignment columns are stored as plain text (one name per cell, or newline-separated for multi-event rows), a `%name%` search is too broad.

## Solution

Replace the `ilike` (substring) filter with an **exact match** approach. Since assignment columns can contain newline-separated values (one per event line), we need to handle both:
- Exact single value: `column = 'SAFAL KC'` (case-insensitive)
- Part of newline-separated list: e.g., `SAFAL KC\nOTHER NAME`

The Supabase/PostgREST filter should use `ilike` but with a stricter pattern that prevents substring matches within other names. The cleanest approach is to switch to a **server-side filter** after fetching, or use a regex-style approach.

Since PostgREST does not support regex directly in `.or()`, the best approach is:

1. Keep the `ilike.%name%` query to get candidates (this is fast and reduces the dataset).
2. **Add a client-side filter** that checks each role column for an exact name match (case-insensitive, respecting newline separators).

This ensures "SAFAL KC" only matches cells where the freelancer name is exactly "SAFAL KC" on its own line, not "AJAY ADHIKARI (SAFAL)".

## Technical Changes

**File: `src/pages/CrewSchedule.tsx`**

After the Supabase query returns results (line 67), add a filtering step:

```typescript
// After: if (!assignRes.error && assignRes.data) ...
// Filter assignments to only include rows where the freelancer name 
// is an EXACT match (case-insensitive) in at least one role column
const exactFiltered = assignRes.data.filter(row => {
  const target = decodedName.trim().toLowerCase();
  return ROLE_COLUMNS.some(col => {
    const val = (row[col] || '').toString();
    // Check each newline-separated entry for exact match
    return val.split('\n').some(entry => entry.trim().toLowerCase() === target);
  });
});
setAssignments(exactFiltered as AssignmentRow[]);
```

This is a universal fix -- it works for any freelancer name regardless of whether their name appears as a substring in another freelancer's name (e.g., "RAM" vs "RAMESH", "SAFAL" vs "AJAY ADHIKARI (SAFAL)").

The broad `ilike` query stays as a pre-filter to keep the database query fast, while the exact-match logic runs client-side on the smaller result set.
