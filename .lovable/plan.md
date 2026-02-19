
# Full Supabase-First Architecture for Freelancer Assignments

## Current Problem (Both Read AND Write are wrong)

### READ is slow:
`getClientFreelancerAssignments()` → always calls Google Sheets edge function → 2–5 second delay every time

### WRITE also blocks the user:
In `useFreelancerAssignments`, `updateAssignment()` does:
```
1. AWAIT updateFreelancerAssignment(...)    ← calls Google Sheets edge function (1-3 seconds)
2. THEN writes to Supabase cache             ← only after Sheets responds
3. THEN updates local state                  ← UI only updates after both finish
```
The user sees a loading spinner for 1-3 seconds every time they assign a freelancer.

## The Correct Architecture (Matching how clients_cache works)

```
READ:   Supabase first (~50ms) → fallback to Sheets only if no data
WRITE:  1. Update local state instantly (0ms)
        2. Write to Supabase (~50ms) — mark synced_to_sheet: false
        3. Background push to Google Sheets (non-blocking, ~2s, .catch logs warning)
```

## Files to Change: 3 files

### 1. `src/lib/freelancer-assignment-cache.ts`

Export the `rowToAssignment` helper (currently private) so it can be used in the API file:
```typescript
// Change:
function rowToAssignment(row: SupabaseAssignmentRow): FreelancerAssignment {
// To:
export function rowToAssignment(row: SupabaseAssignmentRow): FreelancerAssignment {
```

### 2. `src/lib/freelancer-assignment-api.ts`

**A) Fix `getClientFreelancerAssignments` — read Supabase first:**
```typescript
export async function getClientFreelancerAssignments(registeredDateTimeAD: string): Promise<FreelancerAssignment[]> {
  // STEP 1: Supabase first (~50ms)
  try {
    const { data: cached, error } = await supabase
      .from('freelancer_assignments')
      .select('*')
      .eq('registered_date_time_ad', registeredDateTimeAD)
      .order('event_year').order('event_month').order('event_day');

    if (!error && cached && cached.length > 0) {
      return cached.map(rowToAssignment); // instant return, no edge function
    }
  } catch (err) {
    console.warn('[assignments] Supabase read failed, falling back:', err);
  }

  // STEP 2: Fallback to Sheets only if Supabase has no data
  const { data, error } = await supabase.functions.invoke('google-sheets', {
    body: { action: 'getClientFreelancerAssignments', data: { registeredDateTimeAD } }
  });
  if (error) throw new Error('Failed to fetch freelancer assignments');
  if (!data.success) throw new Error(data.error || 'Failed to fetch freelancer assignments');
  return data.data || [];
}
```

**B) Fix `updateFreelancerAssignment` — write to Supabase first, Sheets in background:**

The current function only writes to Sheets. We need it to write to Supabase first, then push to Sheets in background. The function signature stays the same so no callers need updating.

```typescript
export async function updateFreelancerAssignment(
  registeredDateTimeAD: string,
  eventName: string,
  eventDateAD: string,
  field: FreelancerField,
  value: string
): Promise<void> {
  // STEP 1: Write to Supabase immediately (fast ~50ms)
  await updateAssignmentInCache(registeredDateTimeAD, eventName, field, value, eventDateAD);
  // marks synced_to_sheet: false automatically

  // STEP 2: Push to Google Sheets in background (non-blocking)
  supabase.functions.invoke('google-sheets', {
    body: { action: 'updateFreelancerAssignment', data: { registeredDateTimeAD, eventName, eventDateAD, field, value } }
  }).then(({ data, error }) => {
    if (!error && data?.success) {
      // Mark as synced in Supabase
      updateAssignmentInCache(registeredDateTimeAD, eventName, field, value, eventDateAD);
    } else {
      console.warn('[BACKGROUND-SHEETS] Assignment sync to Sheets failed — will retry on next push:', error || data?.error);
    }
  }).catch(err => {
    console.warn('[BACKGROUND-SHEETS] Assignment Sheets call failed:', err);
  });
}
```

**C) Fix `updateRequiredCrewCategories` — same pattern:**
```typescript
export async function updateRequiredCrewCategories(...): Promise<void> {
  // STEP 1: Write to Supabase immediately
  await updateCategoriesInCache(registeredDateTimeAD, eventName, categories, eventDateAD);

  // STEP 2: Push to Sheets in background
  supabase.functions.invoke('google-sheets', {
    body: { action: 'updateRequiredCrewCategories', data: { ... } }
  }).catch(err => console.warn('[BACKGROUND-SHEETS] Categories sync failed:', err));
}
```

### 3. `src/hooks/useFreelancerAssignments.ts`

**Simplify `updateAssignment`** — since `updateFreelancerAssignment` now handles Supabase write internally, remove the duplicate `updateAssignmentInCache` call and update local state BEFORE the async call (instant feedback):

```typescript
const updateAssignment = useCallback(async (eventName, eventDateAD, field, value) => {
  if (!registeredDateTimeAD) return;
  setIsUpdating(field);

  // INSTANT: Update local state first (0ms)
  setAssignments(prev => prev.map(a =>
    a.event.trim() === eventName.trim() && a.eventDateAD.trim() === eventDateAD.trim()
      ? { ...a, [field]: value }
      : a
  ));

  try {
    // Supabase write + background Sheets sync (handled inside updateFreelancerAssignment)
    await updateFreelancerAssignment(registeredDateTimeAD, eventName, eventDateAD, field, value);
  } catch (err) {
    console.error('Failed to save assignment to Supabase:', err);
    // Optionally revert local state on failure
    toast({ title: "Error", description: "Failed to save assignment", variant: "destructive" });
  } finally {
    setIsUpdating(null);
  }
}, [registeredDateTimeAD]);
```

## Result After Fix

| Action | Before | After |
|---|---|---|
| Open Freelancers tab (data in Supabase) | 2–5 seconds | ~50ms instant |
| Assign a freelancer | 1–3 second spinner | Instant dropdown close, background sync |
| Set required categories | 1–3 second wait | Instant, background sync |
| Unsynced assignments | Pushed on next manual sync | Auto-pushed via existing `pushUnsyncedToSheets` mechanism |

## No Schema Changes
The `freelancer_assignments` table already has `synced_to_sheet` column which acts as the background sync flag. The existing `pushUnsyncedToSheets()` and auto-sync in `AllClientsCrewTable` will pick up any rows that failed to sync to Sheets and push them on the next cycle.
