

# Fix: Newly Booked Clients Not Appearing in All Clients (3-Sheet Sync Missing)

## Root Cause

When a client's status is changed to "BOOKED", the `updateClientStatus` backend function correctly copies them to the BOOKED CLIENTS sheet and deletes them from the CLIENT TRACKER. However, it **never triggers the downstream sync** to the 3 dependent sheets:

1. **BOOKED CLIENTS EVENT DETAILS** -- needed for logistics/dashboard
2. **BOOKED CLIENTS FREELANCERS** -- needed for the "All Clients" crew table
3. **BOOKED CLIENTS CONTACT DETAILS** -- needed for contact info

The "All Clients" page reads from the FREELANCERS sheet, so newly booked clients simply don't exist there until a full manual sync is run.

The downstream sync functions already exist and work -- they're called by `updateClient` (when editing a booked client), but they were never wired into `updateClientStatus` (when the status first changes to BOOKED).

## Fix

### File: `supabase/functions/google-sheets/index.ts`

After the `copyToBookedClients` + `deleteTrackerRow` block (around line 2079), add calls to the 3 downstream sync functions:

```typescript
movedToBooked = true;

// --- NEW: Trigger downstream sync to all 3 sheets ---
try {
  await syncToEventDetails(accessToken, spreadsheetId, fetchedRegisteredDateTime);
  console.log(`[STATUS CHANGE] Synced to EVENT DETAILS`);
} catch (evErr) {
  console.warn(`[STATUS CHANGE] EVENT DETAILS sync failed:`, evErr);
}

try {
  await syncSingleClientToFreelancers(accessToken, spreadsheetId, fetchedRegisteredDateTime);
  console.log(`[STATUS CHANGE] Synced to FREELANCERS`);
} catch (flErr) {
  console.warn(`[STATUS CHANGE] FREELANCERS sync failed:`, flErr);
}

try {
  await resyncClientContactDetails(accessToken, spreadsheetId, fetchedRegisteredDateTime);
  console.log(`[STATUS CHANGE] Synced to CONTACT DETAILS`);
} catch (cdErr) {
  console.warn(`[STATUS CHANGE] CONTACT DETAILS sync failed:`, cdErr);
}
```

Each call is wrapped in its own try/catch so a failure in one sheet doesn't block the others. The functions already handle deduplication internally.

## Why This Works

- `syncToEventDetails` creates the EVENT DETAILS row from the BOOKED CLIENTS data
- `syncSingleClientToFreelancers` reads from EVENT DETAILS and creates the FREELANCERS row (which is what "All Clients" displays)
- `resyncClientContactDetails` creates the CONTACT DETAILS row
- All three functions are idempotent -- safe to call multiple times

## Files to Modify

1. `supabase/functions/google-sheets/index.ts` -- add 3 sync calls after the "copy to booked" block in `updateClientStatus`

