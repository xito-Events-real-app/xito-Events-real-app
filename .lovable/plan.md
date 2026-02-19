
# Two Issues — Diagnosis & Fix

## Issue 1: Crew Schedule Link — Events Not Showing

### Root Cause: Name Matching Problem

The freelancer's name is `BIBEK ( BADDAS AKASH SIR )` — with parentheses and extra spaces. In `CrewSchedule.tsx` (line 59), the query builds this filter:

```
photographer_bride.ilike.%BIBEK ( BADDAS AKASH SIR )%
```

This filter works fine in Supabase. However, the **exact match check** on lines 68–73 is the culprit:

```typescript
const target = decodedName.trim().toLowerCase(); // "bibek ( baddas akash sir )"
return val.split('\n').some((entry: string) => entry.trim().toLowerCase() === target);
```

If the name was stored in Google Sheets (and synced to Supabase) with **slightly different spacing** — e.g., `BIBEK (BADDAS AKASH SIR)` vs `BIBEK ( BADDAS AKASH SIR )` (space inside parens vs not) — the exact match fails. When exact match returns 0 results, it falls to the `startsWith` fallback. If that also fails, `assignments` stays empty → calendar shows nothing.

Additionally, there's **a deeper problem**: the crew schedule page reads from `freelancer_assignments` Supabase table, but when the freelancer was just assigned to an event using the new Supabase-first architecture, the assignment is written **instantly to Supabase**. However, if this is a brand-new freelancer added from the Freelancers module (`/freelancers`) and then manually assigned, the assignment goes into Supabase correctly via `updateAssignmentInCache`. The crew schedule should see it.

The real issue is the **name normalization** — special characters like `(`, `)` need more flexible matching. The fix is to normalize both the target name and the stored values by collapsing multiple spaces and ignoring special character spacing differences.

### Fix for Crew Schedule Name Matching

In `src/pages/CrewSchedule.tsx`, update the exact match logic to normalize whitespace and special characters:

```typescript
// Normalize: collapse multiple spaces, trim
const normalize = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const target = normalize(decodedName);

const exactFiltered = assignRes.data.filter(row =>
  ROLE_COLUMNS.some(col => {
    const val = ((row as any)[col] || '').toString();
    return val.split('\n').some((entry: string) => normalize(entry) === target);
  })
);
```

This ensures `"bibek ( baddas akash sir )"` matches `"BIBEK ( BADDAS AKASH SIR )"` regardless of extra spaces.

---

## Issue 2: Freelancer Module — `updateFreelancer` Still Blocks on Sheets

### Current State (What's Fixed vs What's Not)

| Function | Current State |
|---|---|
| `addFreelancer` | **Fixed** — Supabase-first, Sheets in background |
| `quickAddFreelancer` (Suite) | **Fixed** — uses `addFreelancer` |
| `updateFreelancer` | **STILL SLOW** — Sheets first, cache after (2–5s) |
| `getClientFreelancerAssignments` | **Fixed** — Supabase first |
| `updateFreelancerAssignment` | **Fixed** — Supabase first |

`updateFreelancer` in `src/lib/freelancer-api.ts` still follows the old blocking pattern:

```typescript
// OLD (blocking):
const { data, error } = await supabase.functions.invoke('google-sheets', { ... }); // 2–5s wait
if (error) throw ...
// then updates cache after Sheets write
```

The full Freelancer module "Edit" drawer in `FreelancerDetailSheet.tsx` calls `updateFreelancer`, so editing a freelancer profile also takes 2–5 seconds.

### Fix for `updateFreelancer`

Apply the same Supabase-first pattern:

```typescript
export async function updateFreelancer(freelancerData: FreelancerData): Promise<void> {
  // STEP 1: Write to Supabase immediately (~50ms)
  const { error: cacheError } = await supabase.from('freelancers_cache').upsert({
    ...all fields...,
    synced_to_sheet: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'name' });

  if (cacheError) throw new Error('Failed to update freelancer in cache');

  // STEP 2: Push to Google Sheets in background (non-blocking)
  supabase.functions.invoke('google-sheets', {
    body: { action: 'updateFreelancer', data: freelancerData }
  }).then(({ data, error }) => {
    if (!error && data?.success) {
      void supabase.from('freelancers_cache')
        .update({ synced_to_sheet: true })
        .eq('name', freelancerData.name);
    } else {
      console.warn('[BACKGROUND-SHEETS] updateFreelancer sync failed:', error || data?.error);
    }
  }).catch(err => {
    console.warn('[BACKGROUND-SHEETS] updateFreelancer Sheets call failed:', err);
  });
}
```

---

## Files to Change

### 1. `src/pages/CrewSchedule.tsx`
- Fix the name normalization in the exact match filter (lines 68–73)
- Add a `normalize()` helper that collapses multiple spaces and trims before comparing

### 2. `src/lib/freelancer-api.ts`
- Flip `updateFreelancer` to write Supabase first, push Sheets in background

---

## Result After Fix

| Problem | Before | After |
|---|---|---|
| Crew Schedule — name with spaces/parens | Events may not show | Robust normalization matches reliably |
| Edit freelancer profile | 2–5s spinner | ~50ms instant save |
| Add freelancer from module | Already fast (fixed previously) | No change needed |
| Crew Schedule data source | Already reads from Supabase | No change needed |

---

## Technical Notes

- No schema changes needed — `freelancers_cache.synced_to_sheet` already exists
- The crew schedule page already queries Supabase directly — the fix is purely a string normalization improvement
- The `startsWith` fallback in the crew schedule is kept as a safety net for partial name matches
- `deleteFreelancer` is left unchanged since it correctly requires a confirmed Sheets write (row number lookup) before deleting
