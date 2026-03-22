

## Fix: Client Name Propagation Chain + Data Repair

### Current State
- `clients_cache`: "ABHILASHA & BHANU" (correct)
- `freelancer_assignments`: "ABHILASHA & BHANU" (correct)
- `files_management`: "ABHILASHA & BISHNU" (STALE)
- `contact_details_cache`: "ABHILASHA & BISHNU" (STALE)

### Part 1: Fix existing stale data (SQL update)

Run UPDATE on `files_management` and `contact_details_cache` where `registered_date_time_ad = '2026-01-25T13:18:32.040Z'` to set `client_name = 'ABHILASHA & BHANU'`.

### Part 2: Complete the propagation chain — `src/lib/clients-supabase-cache.ts`

**In `updateClientFieldInCache` (after the existing `freelancer_assignments` block, ~line 248)**:
Add propagation to `files_management`, `contact_details_cache`, and `event_details_cache` — same pattern, matching by `registered_date_time_ad`.

**In `updateClientInCacheRecord` (after the existing `freelancer_assignments` block, ~line 335)**:
Same — add the 3 missing table updates.

Both use:
```typescript
for (const table of ['files_management', 'contact_details_cache', 'event_details_cache']) {
  await supabase.from(table).update({ client_name: value }).eq('registered_date_time_ad', registeredDateTimeAD);
}
```

### Files changed
- `src/lib/clients-supabase-cache.ts` (add propagation to 3 more tables in 2 functions)
- One-time SQL data fix for the ABHILASHA record

