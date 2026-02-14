

# Fix: FREELANCERS Sheet Not Populated for New Booked Clients

## Root Cause

When `updateClientStatus` triggers the 3-sheet sync chain, it runs sequentially:
1. `syncToEventDetails` -- appends to EVENT DETAILS (works)
2. `syncSingleClientToFreelancers` -- reads from EVENT DETAILS to find the client (FAILS silently)
3. `resyncClientContactDetails` -- reads from BOOKED CLIENTS directly (works)

The problem: `syncSingleClientToFreelancers` reads EVENT DETAILS immediately after it was just written to. If the Google Sheets API hasn't propagated the append yet, the client row isn't found, and the function silently skips (returns `{ success: true, skipped: true }` -- not an error).

## Fix

### File: `supabase/functions/google-sheets/index.ts`

**Add a fallback in `syncSingleClientToFreelancers`** (around line 6559-6563)

When the client is NOT found in EVENT DETAILS, instead of silently skipping, fall back to reading directly from the BOOKED CLIENTS sheet and build the freelancer row from that data.

```typescript
// Current (breaks silently):
const evRow = eventRows.find(...);
if (!evRow) {
  console.log(`... not found in EVENT DETAILS, skipping`);
  return { success: true, skipped: true };
}

// Fixed (falls back to BOOKED CLIENTS):
let evRow = eventRows.find(...);
if (!evRow) {
  console.log(`... not found in EVENT DETAILS, reading from BOOKED CLIENTS instead`);
  // Read from BOOKED CLIENTS directly
  const bookedRange = encodeURIComponent("'BOOKED CLIENTS'!A2:P1000");
  const bookedResp = await fetchWithRetry(...);
  const bookedRows = ...;
  const bookedRow = bookedRows.find(r => r[0].trim() === normalizedId);
  if (!bookedRow) {
    return { success: true, skipped: true };  // truly not found anywhere
  }
  // Build equivalent evRow from BOOKED CLIENTS columns
  // A=col0, B=col1, C=col2, D=col11(events), E=col12, F=col13, G=col14, H=col15
  evRow = [
    bookedRow[0], bookedRow[1], bookedRow[2],
    bookedRow[11], bookedRow[12], bookedRow[13], bookedRow[14], bookedRow[15]
  ];
}
```

This mirrors exactly what `syncToEventDetails`/`copyToEventDetails` does (mapping BOOKED CLIENTS columns L-P to EVENT DETAILS columns D-H), so the data will be identical.

## Why This Works

- EVENT DETAILS and CONTACT DETAILS both work because they read from BOOKED CLIENTS directly
- FREELANCERS was the only one depending on EVENT DETAILS as an intermediary
- This fallback removes that dependency chain, making FREELANCERS sync self-sufficient
- The function remains idempotent -- safe to call multiple times

## Files to Modify

1. `supabase/functions/google-sheets/index.ts` -- add BOOKED CLIENTS fallback in `syncSingleClientToFreelancers` (around lines 6559-6563)

