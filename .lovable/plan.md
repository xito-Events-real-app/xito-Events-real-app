

## Plan: Propagate Client Name Changes to Freelancer Assignments

### Problem
When a client name is edited (e.g., "Abhilasha & Bishnu" → "Abhilasha & Bhanu"), it updates `clients_cache.client_name` but does NOT update `freelancer_assignments.client_name`. The "All Clients" crew table reads from `freelancer_assignments`, so it keeps showing the old name.

### Root Cause
`updateClientInCacheRecord()` in `src/lib/clients-supabase-cache.ts` only updates the `clients_cache` table. There is no cascading update to `freelancer_assignments` rows that share the same `registered_date_time_ad`.

### Fix
After the `clients_cache` update in `updateClientInCacheRecord()`, add a secondary update to `freelancer_assignments` to sync the `client_name` for all rows matching the same `registered_date_time_ad`.

### Changes

**File: `src/lib/clients-supabase-cache.ts`** (lines 261-307)

Inside `updateClientInCacheRecord()`, after the existing `clients_cache` update succeeds (line 305), add:

```typescript
// Propagate client_name change to freelancer_assignments
if (client.clientName) {
  await supabase
    .from('freelancer_assignments')
    .update({ client_name: client.clientName })
    .eq('registered_date_time_ad', client.registeredDateTimeAD);
}
```

This ensures that whenever a client record is saved (from the Client Detail sheet or any other edit path), the freelancer assignments table stays in sync. The realtime subscription in `AllClientsCrewTable` will automatically pick up the change since it already listens for `postgres_changes` on `freelancer_assignments`.

### Scope
- Single file change: `src/lib/clients-supabase-cache.ts`
- No UI changes needed -- the All Clients table already has realtime listeners

