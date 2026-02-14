

# Fix: Data Starting from Column AB Instead of Column A

## Root Cause

The `syncSingleClientToFreelancers` function uses the Google Sheets `:append` API with range `'BOOKED CLIENTS FREELANCERS'!A:AA`. The `:append` API auto-detects the "table boundaries" in the sheet. If the sheet has any data, formatting, or headers beyond column AA, Google Sheets interprets the table as wider and places the appended data after the last detected column -- resulting in data landing at column AB or later.

## Fix

### File: `supabase/functions/google-sheets/index.ts`

**Replace the `:append` call in `syncSingleClientToFreelancers` (lines 6669-6684) with a two-step approach:**

1. Find the next empty row by reading column A
2. Write the new row to that specific row using PUT (exact positioning)

```
// Current (unreliable):
const appendUrl = `.../'BOOKED CLIENTS FREELANCERS'!A:AA:append?...`;
await fetchWithRetry(appendUrl, { method: 'POST', body: ... });

// Fixed (exact row targeting):
// Step 1: Read column A to find next empty row
const colARange = encodeURIComponent("'BOOKED CLIENTS FREELANCERS'!A2:A1000");
const colAResp = await fetchWithRetry(colAUrl, ...);
const colARows = colAData.values || [];
const nextRow = colARows.length + 2; // +2 for header + 1-indexed

// Step 2: PUT to exact range A{nextRow}:AA{nextRow}
const writeRange = `'BOOKED CLIENTS FREELANCERS'!A${nextRow}:AA${nextRow}`;
await fetchWithRetry(writeUrl, { method: 'PUT', body: { values: [newRow] } });
```

This guarantees data always starts at column A regardless of sheet formatting or existing data boundaries.

**Also apply the same fix to `fullSyncFreelancerAssignments` (line 6764)** which uses the same `:append` pattern and could have the same issue.

## Technical Details

- Both `syncSingleClientToFreelancers` (single-client, line 6678) and `fullSyncFreelancerAssignments` (bulk, line 6764) will be updated
- The newRow array structure (27 elements: A-H metadata, I-R roles, S-Z empty, AA categories) remains unchanged
- Uses `fetchWithRetry` for rate limit resilience
- For the bulk function, we calculate the starting row once and increment for each new row

## Files to Modify

1. `supabase/functions/google-sheets/index.ts` -- replace `:append` with explicit row PUT in both `syncSingleClientToFreelancers` (lines 6678-6683) and `fullSyncFreelancerAssignments` (lines 6763-6769)

