

# Audit: Payment Dropdowns Also Bypass Supabase-First

## Problem

All three payment components fetch dropdown data (banks, payment types) via `getDropdowns()` from `sheets-api.ts`, which calls the Google Sheets edge function directly. This violates the Supabase-First architecture.

You already have `useDropdownData` hook that reads from the `dropdowns_cache` table -- but payment components don't use it.

## Affected Components (3 files)

| File | What it fetches | How |
|------|----------------|-----|
| `PaymentHistorySheet.tsx` | `banks` | `getDropdowns()` (Sheets) |
| `finance/PaymentDrawer.tsx` | `paymentTypes`, `banks` | `getDropdowns()` (Sheets) |
| `booked/PaymentDrawer.tsx` | `paymentTypes`, `banks` | `getDropdowns()` (Sheets) |

## Fix: Use Parent-Passed Dropdown Data

The cleanest approach: pass `paymentTypes` and `banks` as props from the parent, which already has dropdown data from `useDropdownData` or `useCachedData`.

### File 1: `src/components/finance/PaymentHistorySheet.tsx`
- Add `paymentTypes` and `banks` to props interface
- Remove `getDropdowns` import
- Remove the `useEffect` that calls `getDropdowns()` (lines 162-176)
- Remove local `banks` state -- use props directly
- Add `paymentTypes` prop for the edit dialog's payment type selector

### File 2: `src/components/finance/PaymentDrawer.tsx`
- Add `paymentTypes` and `banks` to props interface (they're already partially there from parent)
- Remove `getDropdowns` import and the `useEffect` that fetches them (lines 73-84)
- Remove local `paymentTypes` and `banks` state -- use props directly

### File 3: `src/components/booked/PaymentDrawer.tsx`
- Same changes as File 2

### File 4: Parent components that render these drawers
- Pass `paymentTypes` and `banks` from the existing dropdown data
- Parents like `FinanceClientCard`, `MobileFinanceManager`, `DesktopFinanceManager`, `BookedClientCard` already have access to dropdown data or can receive it as props

### File 5: `src/components/finance/PaymentHistorySheet.tsx` -- Supabase-First Edit
- Rewrite `handleEditPaymentSubmit` to follow Three-Layer Write Contract:
  1. Rebuild the edited payment line locally
  2. Recalculate remaining payment
  3. Update `clients_cache` via `updateClientFieldInCache` (set `synced_to_sheet: false`)
  4. Call `onPaymentAdded()` to refresh UI from DB
  5. Background: call `updatePayment()` to Sheets (non-blocking)

### File 6: `src/components/finance/PaymentDrawer.tsx` -- Supabase-First Add
- After `computePaymentUpdate`, add `updateClientFieldInCache` calls for `payments_made`, `payment_dates_ad`, `remaining_payment` before `onPaymentAdded()`

### File 7: `src/components/booked/PaymentDrawer.tsx` -- Supabase-First Add
- Same DB cache writes as File 6

## Summary of All Changes

```text
DROPDOWN FIX (3 files):
  - Remove getDropdowns() calls from 3 payment components
  - Pass paymentTypes + banks as props from parent

PAYMENT WRITE FIX (3 files):
  - PaymentHistorySheet: DB-first edit
  - Finance PaymentDrawer: DB-first add
  - Booked PaymentDrawer: DB-first add
```

## Risk Assessment
- Zero risk to leads/tracker: all changes in booked payment flows only
- Dropdown fallback: if props are empty, use hardcoded defaults (same as current catch blocks)
- No schema changes needed

