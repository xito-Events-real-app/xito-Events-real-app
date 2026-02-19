
# Fix: Quick Add Freelancer — Supabase-First Write for Instant Assignment

## The Problem: `addFreelancer` Blocks on Google Sheets

When you click "Save & Assign" in the Quick Add Freelancer dialog from the Suite's All Clients crew table, the current write order in `src/lib/freelancer-api.ts` is:

```
Step 1: AWAIT google-sheets Edge Function (addFreelancer)  ← BLOCKS 2–5 seconds
Step 2: Then upsert into freelancers_cache in Supabase     ← Only after Sheets responds
Step 3: Then handleQuickAddSuccess runs                     ← Refreshes dropdown, assigns
```

The user is staring at a spinner for the entire duration of the Google Sheets write before the freelancer shows up in the list and gets auto-assigned.

## The Fix: Supabase-First Write (Same Pattern as Assignments)

Flip `addFreelancer` to follow the same architecture that was applied to `updateFreelancerAssignment`:

```
Step 1: Write to freelancers_cache in Supabase IMMEDIATELY (~50ms)
Step 2: Call onSuccess(name) → freelancer appears in list, gets assigned instantly
Step 3: Push to Google Sheets in BACKGROUND (non-blocking, ~2–5s)
```

## What Exactly Will Change

### File 1: `src/lib/freelancer-api.ts` — `addFreelancer` function (lines 103–146)

Currently it does:
```typescript
// OLD: Blocks for 2-5 seconds before cache
const { data, error } = await supabase.functions.invoke('google-sheets', { ... });
if (error) throw ...
// Then upserts to cache
await supabase.from('freelancers_cache').upsert({ ... });
```

New pattern:
```typescript
// NEW: Write to Supabase first (~50ms) — synced_to_sheet: false
await supabase.from('freelancers_cache').upsert({
  name: freelancerData.name || '',
  contact_no: freelancerData.contactNo || '',
  ...all other fields...,
  synced_to_sheet: false,   // ← marks it as pending Sheets sync
  updated_at: new Date().toISOString(),
}, { onConflict: 'name' });

// Push to Google Sheets in background (non-blocking)
supabase.functions.invoke('google-sheets', {
  body: { action: 'addFreelancer', data: freelancerData }
}).then(({ data, error }) => {
  if (!error && data?.success) {
    // Mark synced in cache
    supabase.from('freelancers_cache')
      .update({ synced_to_sheet: true })
      .eq('name', freelancerData.name || '')
      .catch(() => {});
  } else {
    console.warn('[BACKGROUND-SHEETS] addFreelancer sync failed:', error || data?.error);
  }
}).catch(err => {
  console.warn('[BACKGROUND-SHEETS] addFreelancer Sheets call failed:', err);
});
```

This means `addFreelancer` completes in ~50ms instead of 2–5 seconds.

## Result After Fix

| Action | Before | After |
|---|---|---|
| Click "Save & Assign" | Spinner for 2–5 seconds | Dialog closes in ~100ms |
| Freelancer appears in dropdown | After Sheets write completes | Instantly from Supabase cache |
| Auto-assignment after quick-add | Delayed by 2–5s | Immediate |
| Data in Google Sheets | Instant (blocking write) | Within ~5s (background write) |

## File Changed

- `src/lib/freelancer-api.ts` — flip `addFreelancer` to write Supabase first, push Sheets in background

No other files need changing. The `quickAddFreelancer` function in `freelancer-assignment-api.ts` calls `addFreelancer` directly, so it inherits the speedup automatically. The `handleQuickAddSuccess` in `AllClientsCrewTable` calls `getFreelancers()` after — which already reads from `freelancers_cache` first (Supabase-first read is already implemented), so the newly added freelancer will be found immediately.

## No Schema Changes

The `freelancers_cache` table already has `synced_to_sheet` column. No migrations needed.
