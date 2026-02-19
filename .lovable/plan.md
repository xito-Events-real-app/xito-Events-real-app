
# Fix: Freelancer Rename — Duplicate Row Cleanup + Assignment Sweep

## What the Database Shows Right Now

Querying `freelancers_cache` for `row_number = 2` returns **two rows**:

```
row_number: 2 | name: BIBEK BADDAS AKASH SIR        | updated_at: 2026-02-19 12:28  ← new name
row_number: 2 | name: BIBEK ( BADDAS AKASH SIR )    | updated_at: 2026-02-19 12:10  ← stale old row
```

The old name was never deleted — so both names appear in the All Clients dropdown. This is the confirmed root cause.

## Why It Happened

`updateFreelancer` uses `upsert({ onConflict: 'name' })`. When the name changes:
- The upsert looks for a matching `name` — finds none (new name doesn't exist yet)
- So it **inserts** a brand new row for the new name
- The old name row (`BIBEK ( BADDAS AKASH SIR )`) is **never touched**

Result: both names coexist in `freelancers_cache` indefinitely.

## What the User Confirmed

- Google Sheets WTN FREELANCERS → FREELANCERS tab: only new name `BIBEK BADDAS AKASH SIR` ✓
- BOOKED CLIENTS freelancer assignments: only new name ✓
- Supabase `freelancers_cache`: still has BOTH names ✗ (this is the bug)

So Sheets is already correct. We just need to fix `updateFreelancer` to clean up the old row in Supabase, and also sweep assignments in `freelancer_assignments` Supabase table in case any are stored under the old name.

## The Two Changes

### Change 1: Fix `updateFreelancer` in `src/lib/freelancer-api.ts`

Change the upsert strategy from **conflict on `name`** to:

1. Look up the existing record by `row_number` first
2. If name changed → delete all rows for that `row_number` that have the old name
3. Upsert the new record (by `row_number` conflict — or insert fresh after deletion)
4. If name changed → sweep `freelancer_assignments` table and replace old name → new name in all 10 role columns
5. Push to Google Sheets in background (unchanged)

```typescript
export async function updateFreelancer(freelancerData: FreelancerData): Promise<void> {
  let oldName: string | null = null;

  // STEP 0: Detect rename — find current names for this row_number
  if (freelancerData.rowNumber) {
    const { data: existing } = await supabase
      .from('freelancers_cache')
      .select('name')
      .eq('row_number', freelancerData.rowNumber);

    if (existing && existing.length > 0) {
      const staleRows = existing.filter(r => r.name !== freelancerData.name);
      if (staleRows.length > 0) {
        oldName = staleRows[0].name;
        // Delete ALL stale rows for this row_number
        await supabase
          .from('freelancers_cache')
          .delete()
          .eq('row_number', freelancerData.rowNumber)
          .neq('name', freelancerData.name);
      }
    }
  }

  // STEP 1: Upsert new data — Supabase first (~50ms)
  await supabase.from('freelancers_cache').upsert({
    row_number: freelancerData.rowNumber,
    name: freelancerData.name,
    ...all fields...,
    synced_to_sheet: false,
    updated_at: new Date().toISOString(),
  } as any, { onConflict: 'name' });

  // STEP 2: If renamed, sweep freelancer_assignments in Supabase
  if (oldName && oldName !== freelancerData.name) {
    const assignmentColumns = [
      'photographer_bride', 'photographer_groom',
      'videographer_bride', 'videographer_groom',
      'extra_photographer', 'extra_videographer',
      'assistant', 'iphone_shooter',
      'drone_operator', 'fpv_operator'
    ];
    for (const col of assignmentColumns) {
      await supabase
        .from('freelancer_assignments')
        .update({ [col]: freelancerData.name, synced_to_sheet: false })
        .eq(col, oldName);
    }
    console.log(`[freelancer-api] Renamed "${oldName}" → "${freelancerData.name}" in assignments`);
  }

  // STEP 3: Push to Google Sheets in background (non-blocking)
  supabase.functions.invoke('google-sheets', { ... }).then(...).catch(...);
}
```

### Change 2: One-time cleanup in `getFreelancers` — deduplicate by `row_number`

Since the duplicate already exists right now in the database, add a deduplication step inside `getFreelancers` that runs once to clean up any rows where the same `row_number` has multiple entries. It keeps the most recently updated one and deletes the older ones.

```typescript
export async function getFreelancers(limit = 500): Promise<FreelancerData[]> {
  const { data: cached } = await supabase
    .from('freelancers_cache')
    .select('*')
    .order('row_number', { ascending: true })
    .limit(limit);

  if (cached && cached.length > 0) {
    // Deduplicate: if same row_number appears twice, keep newest, delete rest
    const seenRowNumbers = new Map<number, any>();
    const toDelete: string[] = [];

    for (const row of cached) {
      const rn = row.row_number;
      if (rn && seenRowNumbers.has(rn)) {
        const existing = seenRowNumbers.get(rn);
        // Keep newer, delete older
        if (new Date(row.updated_at) > new Date(existing.updated_at)) {
          toDelete.push(existing.id);
          seenRowNumbers.set(rn, row);
        } else {
          toDelete.push(row.id);
        }
      } else {
        seenRowNumbers.set(rn, row);
      }
    }

    if (toDelete.length > 0) {
      await supabase.from('freelancers_cache').delete().in('id', toDelete);
      // Return deduplicated list
      return cached
        .filter(r => !toDelete.includes(r.id))
        .map(cacheRowToFreelancer);
    }

    return cached.map(cacheRowToFreelancer);
  }
  // ... fallback to Sheets
}
```

This immediately fixes the existing `BIBEK ( BADDAS AKASH SIR )` stale row the next time `getFreelancers()` is called (which happens when the All Clients crew table or Freelancers module loads).

## Result After Fix

| Problem | Before | After |
|---|---|---|
| Both old and new name in dropdown | Old row never deleted on rename | Detect rename by `row_number`, delete stale rows before upsert |
| Existing duplicate `BIBEK (...)` row | Still in DB | Auto-cleaned on next `getFreelancers()` call |
| Assignment goes empty | Old name in Supabase assignments causes Sheets pull to overwrite | Sweep all 10 role columns in `freelancer_assignments` with new name |
| Future renames | Same bug repeats | Fixed — delete-then-upsert pattern is now permanent |

## Files Changed

- `src/lib/freelancer-api.ts` — two changes:
  1. `updateFreelancer`: delete old row by `row_number` before upsert + assignment sweep
  2. `getFreelancers`: add deduplication pass to auto-clean any current stale rows

No schema changes. No other files.
