
# Fix: Venue Data Cross-Contamination Between Clients

## Root Cause

The venue data transfer from Sargat Thapa to Sapna Bista is caused by a **race condition** in the `updateClientEventDetails` function in the backend.

Here is what happens:

1. When you open Client A's detail page, `useEventDetails` calls `refreshClientVendorData` in the background
2. `refreshClientVendorData` calls `getClientEventDetails` which reads the entire EVENT DETAILS sheet and finds Client A at, say, row 5
3. Meanwhile, if any other operation (sync, another client update, or a delete) inserts or removes a row in the sheet...
4. The row number is now **stale** -- row 5 might now belong to a different client
5. The `updateClientEventDetails` function then writes Client A's venue data to what is now **Client B's row**

This is the exact scenario: Sargat Thapa's venue data was written to the row that had shifted to become Sapna Bista's row.

Additionally, there is a **second bug** in `sync-all-data/index.ts` line 409: it reads from `'EVENT DETAILS'!A2:AH5000` instead of `'BOOKED CLIENTS EVENT DETAILS'!A2:AH5000` -- the wrong sheet name! This means the Supabase event_details_cache never gets populated correctly by Master Sync.

## Fix Plan

### 1. Fix the race condition in `updateClientEventDetails` (Edge Function)

**File**: `supabase/functions/google-sheets/index.ts`

Add a **verification step** before writing: after computing the row number, verify that Column A of that row still matches the expected `registeredDateTimeAD` before writing. This prevents writing to a shifted row.

```
BEFORE: Find row -> compute updates -> write to row
AFTER:  Find row -> compute updates -> re-verify Column A matches -> write to row (or abort if mismatch)
```

Specifically, change `updateClientEventDetails` to:
- After finding `rowNumber`, store the `registeredDateTimeAD` from that row
- Before the PUT request, do a single-cell read of Column A at `rowNumber` to verify it still matches
- If it does NOT match, re-scan the entire sheet to find the correct row number and use that instead
- This eliminates the race window

### 2. Fix the same race condition in `refreshClientVendorData`

**File**: `supabase/functions/google-sheets/index.ts`

The `refreshClientVendorData` function calls `updateClientEventDetails` which already has the fix from step 1. No additional change needed here -- the fix propagates.

### 3. Fix the wrong sheet name in `sync-all-data`

**File**: `supabase/functions/sync-all-data/index.ts`

Line 409: Change `"'EVENT DETAILS'!A2:AH5000"` to `"'BOOKED CLIENTS EVENT DETAILS'!A2:AH5000"`.

This fixes Master Sync so the `event_details_cache` in Supabase actually gets populated, which means most reads will come from Supabase instead of hitting Google Sheets (reducing the chance of race conditions further).

### 4. Fix `pullEventDetails` data parsing in `sync-all-data`

The `pullEventDetails` function currently treats each Google Sheet row as a separate event record. But in the `BOOKED CLIENTS EVENT DETAILS` sheet, each client has **one row** with multi-line cells (newline-separated events). The function needs to parse multi-line values correctly (split by `\n` and create one record per event line), matching how `getClientEventDetails` works.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/google-sheets/index.ts` | Add row verification before writes in `updateClientEventDetails` to prevent race conditions |
| `supabase/functions/sync-all-data/index.ts` | Fix sheet name from `EVENT DETAILS` to `BOOKED CLIENTS EVENT DETAILS` and fix multi-line parsing |

## Impact

- Eliminates the venue data cross-contamination bug completely
- Master Sync now correctly populates `event_details_cache` in Supabase
- With populated cache, most event detail reads come from Supabase (faster, no race condition)
- Google Sheets writes are verified before execution, preventing stale row overwrites
