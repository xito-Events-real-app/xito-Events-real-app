
# Fix: Benzo Keep Client Search Should Include Booked Clients

## Problem

When searching for clients in the Benzo Keep notepad (either from the Suite Notepad dialog or the Assign Note dialog), only clients from the `CLIENT TRACKER` sheet are returned. Booked clients (who live exclusively in the `BOOKED CLIENTS` sheet) are missing from search results.

## Root Cause

The backend function `getClientsForNoteAssignment` (line 722-756 in the edge function) only reads from `'CLIENT TRACKER'!A2:AL500`. It never queries the `BOOKED CLIENTS` sheet.

## Fix

Update `getClientsForNoteAssignment` in `supabase/functions/google-sheets/index.ts` to also fetch clients from the `BOOKED CLIENTS` sheet and merge them into the results.

### Changes in `supabase/functions/google-sheets/index.ts`

1. After fetching from `'CLIENT TRACKER'!A2:AL500`, also fetch from `'BOOKED CLIENTS'!A2:AL500` using the same column mapping
2. Merge both arrays together
3. Deduplicate by `registeredDateTimeAD` (prioritizing booked records, consistent with existing architecture)
4. Return the combined list

The column layout is identical between both sheets (A-AG shared schema per memory), so the same row-to-object mapping works for both.

### Technical Detail

```
Current flow:
  CLIENT TRACKER -> return results

New flow:
  CLIENT TRACKER -> results1
  BOOKED CLIENTS -> results2
  Merge & deduplicate (booked wins) -> return combined
```

### Files Modified

| File | Change |
|---|---|
| `supabase/functions/google-sheets/index.ts` | Add `BOOKED CLIENTS` fetch to `getClientsForNoteAssignment`, merge and deduplicate results |
