

# Fix: Make All Update Functions Sheet-Aware

## The Core Problem

Right now, **8 update functions** in the backend are hardcoded to write to the `CLIENT TRACKER` sheet. When you update a client who is actually in `BOOKED CLIENTS`, the system writes to the **same row number but in the wrong sheet**, corrupting a completely different client's data.

This is what happened:
- Beyond_true is in BOOKED CLIENTS row 4
- Status update wrote to CLIENT TRACKER row 4 (Elena Acharya)
- Elena got a fake "BOOKED" status and was treated as a booked client

## The Fix

One function -- `addClientComment` -- already has the correct "sheet-aware" logic that searches both sheets. We apply the **exact same pattern** to all 8 broken functions.

### Pattern (already working in addClientComment):

```text
1. If registeredDateTimeAD is provided:
   a. Search BOOKED CLIENTS first
   b. If found there, write to BOOKED CLIENTS
   c. If not found, search CLIENT TRACKER and write there
2. If no registeredDateTimeAD, fall back to CLIENT TRACKER (legacy)
```

### Functions to fix (all in google-sheets/index.ts):

| Function | Column | Currently | Fix |
|----------|--------|-----------|-----|
| `updateClientStatus` | W (status_log) | Hardcoded CLIENT TRACKER | Add sheet routing |
| `updateClientHandler` | X (handler) | Hardcoded CLIENT TRACKER | Add sheet routing |
| `updateClientQuotation` | V (quotation) | Hardcoded CLIENT TRACKER | Add sheet routing |
| `updateClientMindset` | Z (mindset) | Hardcoded CLIENT TRACKER | Add sheet routing |
| `updateBargainingRates` | AA+AB (rates) | Hardcoded CLIENT TRACKER | Add sheet routing |
| `updateClientBargainedRates` | AB (client rates) | Hardcoded CLIENT TRACKER | Add sheet routing |
| `updateOurCounterRates` | AA (our rates) | Hardcoded CLIENT TRACKER | Add sheet routing |
| `updateFinalQuotation` | AD (final quote) | Hardcoded CLIENT TRACKER | Add sheet routing |
| `logCallAttempt` | Y (call log) | Hardcoded CLIENT TRACKER | Add sheet routing |

### What changes in each function:

Replace this pattern:
```text
const actualRowNumber = await verifyRowNumber(
  accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD
);
// ... writes to 'CLIENT TRACKER'!Column${actualRowNumber}
```

With this pattern (copied from addClientComment):
```text
let targetSheet = 'CLIENT TRACKER';
let actualRowNumber = rowNumber;

if (registeredDateTimeAD) {
  const bookedRow = await verifyRowNumber(
    accessToken, spreadsheetId, 'BOOKED CLIENTS', -1, registeredDateTimeAD
  );
  if (bookedRow !== -1) {
    targetSheet = 'BOOKED CLIENTS';
    actualRowNumber = bookedRow;
  } else {
    actualRowNumber = await verifyRowNumber(
      accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD
    );
  }
}
// ... writes to '${targetSheet}'!Column${actualRowNumber}
```

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/google-sheets/index.ts` | Apply sheet-aware routing to all 9 update functions listed above |

## What This Does NOT Change

- No frontend code changes
- No new parameters needed (all functions already accept `registeredDateTimeAD`)
- No database schema changes
- The existing `addClientComment` function stays exactly as-is (it already works correctly)
- Read operations (getClients, getSingleClient, etc.) are unaffected

## After the Fix

- Status changes, quotations, handler updates, mindset changes, bargaining rates, call logs, and final quotations will all correctly target whichever sheet the client is actually in
- No more cross-contamination between clients in different sheets

