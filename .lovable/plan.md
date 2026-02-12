

# Fix: addClientComment Must Search Both Sheets

## Problem
The backend `addClientComment` function (line 2804) is hardcoded to only search `'CLIENT TRACKER'` when verifying the row number. Since booked clients like Urusha Ghimirey exist **only** in the `'BOOKED CLIENTS'` sheet (they are transferred out of the Tracker), `verifyRowNumber` can't find her, falls back to the raw `rowNumber`, and writes the comment to whoever is at that row in the Tracker (Anuja/Birat Wosti).

## Fix (Single file: Edge Function)

Update `addClientComment` in `supabase/functions/google-sheets/index.ts` (~line 2790-2835):

1. When `registeredDateTimeAD` is provided, first search `'BOOKED CLIENTS'` Column A
2. If found there, write the comment to that row in `'BOOKED CLIENTS'` (no cross-sheet sync needed since the client only exists in one sheet)
3. If NOT found in Booked, search `'CLIENT TRACKER'` as before
4. If `registeredDateTimeAD` is not provided, fall back to the current behavior (raw `rowNumber` on Tracker)

No cross-sheet syncing is needed because clients only exist in one sheet at a time.

## Technical Detail

```text
Current flow:
  verifyRowNumber(... 'CLIENT TRACKER' ...) --> not found --> falls back to raw rowNumber on Tracker --> WRONG CLIENT

Fixed flow:
  verifyRowNumber(... 'BOOKED CLIENTS' ...) --> found at row X --> write to BOOKED CLIENTS row X --> CORRECT
  OR
  verifyRowNumber(... 'CLIENT TRACKER' ...) --> found at row Y --> write to CLIENT TRACKER row Y --> CORRECT
```

The activity log call (`appendActivityLog`) will also target the correct sheet instead of being hardcoded to `'CLIENT TRACKER'`.

No frontend changes needed -- the previous fix already passes `registeredDateTimeAD` from all callers.
