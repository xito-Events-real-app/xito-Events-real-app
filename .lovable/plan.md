

# Fix: Stale Event Name Verification and Inefficient Crew Fetching

## Issues Found

### Issue 1: Event Name Verification Can Send Empty Name (Critical)
In `src/hooks/useEventDetails.ts`, the `updateEventDetail` callback references `data` (the hook's state) on line 210, but `data` is **not listed in the useCallback dependency array** (line 252). This means the closure captures the initial `null` value of `data`, so `_eventName` is always sent as an empty string `''`. The backend verification we just added will never actually verify anything because it never receives the event name.

**Fix:** Add `data` to the dependency array of `updateEventDetail`.

```
// Line 252: Change from
}, [registeredDateTimeAD, fetchFromSheets]);
// To
}, [registeredDateTimeAD, fetchFromSheets, data]);
```

### Issue 2: `getAllFreelancerAssignments` Bypasses Supabase Cache
In `src/lib/freelancer-assignment-api.ts` (lines 190-196), the `getAllFreelancerAssignments` function always calls the Google Sheets edge function directly instead of reading from the `freelancer_assignments` Supabase table. This is used by `TodayEventsHero` and is inconsistent with the Supabase-first architecture.

**Fix:** Change `getAllFreelancerAssignments` to read from Supabase first, falling back to Google Sheets only if the cache is empty.

```
export async function getAllFreelancerAssignments(): Promise<FreelancerAssignment[]> {
  // STEP 1: Read from Supabase cache first (fast, ~50ms)
  try {
    const { data: cached, error } = await supabase
      .from('freelancer_assignments')
      .select('*')
      .order('event_year', { ascending: true })
      .order('event_month', { ascending: true })
      .order('event_day', { ascending: true });

    if (!error && cached && cached.length > 0) {
      return (cached as any[]).map(rowToAssignment);
    }
  } catch (err) {
    console.warn('[getAllAssignments] Supabase read failed, falling back:', err);
  }

  // STEP 2: Fallback to Google Sheets
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'getAllFreelancerAssignments' }
  });
  if (error) throw new Error('Failed to fetch all freelancer assignments');
  if (!data.success) throw new Error(data.error || 'Failed');
  return data.data || [];
}
```

## Summary

| File | Issue | Fix |
|------|-------|-----|
| `src/hooks/useEventDetails.ts` | `data` missing from useCallback deps -- `_eventName` always empty | Add `data` to dependency array |
| `src/lib/freelancer-assignment-api.ts` | `getAllFreelancerAssignments` always calls Sheets instead of Supabase | Read from Supabase first, Sheets fallback |

These two fixes ensure:
1. The event name verification safety net actually works (prevents wrong-line writes)
2. Crew assignments load instantly from Supabase instead of making slow Sheets API calls

