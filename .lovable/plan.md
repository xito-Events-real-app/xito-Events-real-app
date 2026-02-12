

# Fix: Comments Appearing on Wrong Client

## Root Cause

The `addClientComment` function only sends `rowNumber` to the backend, but does NOT send `registeredDateTimeAD` (the unique client identifier). When rows shift in Google Sheets (because new clients are added), the `rowNumber` becomes stale, causing the comment to be written to a **different client's row**.

For example: You open Urusha Ghimirey (row 15), but by the time you add a comment, a new client was added above her, shifting her to row 16. The comment goes to row 15 -- which is now Anuja (Birat Wosti).

The `addBookedClientComment` function already handles this correctly by passing `registeredDateTimeAD`. The fix is to do the same for `addClientComment`.

## Changes

### 1. Update `addClientComment` in `sheets-api.ts`
Add `registeredDateTimeAD` as an optional parameter and pass it to the backend, so the backend's `verifyRowNumber` can find the correct row.

### 2. Update all callers to pass `registeredDateTimeAD`

**`ClientDetail.tsx`** -- Pass `client.registeredDateTimeAD` when calling `addClientComment`.

**`FreshClientCard.tsx`** -- Same fix: pass `client.registeredDateTimeAD`.

**`DesktopClientRow.tsx`** -- Same fix: pass `client.registeredDateTimeAD`.

## Why This Works

The backend already has `verifyRowNumber()` which searches Column A for the `registeredDateTimeAD` value to find the **actual** current row, regardless of shifts. It's already being used for comments -- but only when `registeredDateTimeAD` is provided. When it's `undefined`, it falls back to the raw (potentially stale) `rowNumber`.

