
# Fix Two Finance Module Issues

## Issue 1: PaymentDrawer Faded/Unclickable in Finance Manager

**Root Cause:** Z-index conflict. The `PaymentHistorySheet` uses the `Sheet` component which renders at `z-[150]` (both overlay and content). When "Add Payment" is clicked from within this Sheet, it opens a `PaymentDrawer` which uses the `Drawer` component rendered at `z-50`. The Drawer appears **behind** the Sheet overlay, making it visible but faded and unclickable.

The same issue affects the "Edit Payment" dialog inside `PaymentHistorySheet` -- the `Dialog` component also uses `z-50`.

**Fix:** Update the `Drawer` component's overlay and content z-index from `z-50` to `z-[200]`, so it renders above the Sheet's `z-[150]`. Similarly, ensure the Dialog component used for editing payments also has sufficient z-index.

**Files to change:**
- `src/components/ui/drawer.tsx` -- Change `z-50` to `z-[200]` on both `DrawerOverlay` and `DrawerContent`

---

## Issue 2: Payment Not Written to INCOME WTN Sheet During BOOKED Transition

**Root Cause:** When a client status is changed to BOOKED with an advance payment, the `handleSaveBookedPayment` function (in `DesktopClientRow.tsx`, `ClientDetail.tsx`, and `FreshClientCard.tsx`) was refactored to use the Supabase-first architecture. The background Sheets sync now relies on `pushUnsyncedToSheets`, which only pushes raw column data to the BOOKED CLIENTS sheet. It does **not** call the `addPayment` edge function action, which is the only path that triggers the income sync to the "INCOME WTN" sheet in the WTN INCOME & EXPENSES spreadsheet.

The same issue applies when adding payments from the Finance Manager's `PaymentDrawer` -- that component **does** call `addPayment()` in the background (line 137), so payments added from the Finance module should sync to income. But the BOOKED transition path skips this entirely.

**Fix:** In all three `handleSaveBookedPayment` implementations, add a background call to `addPayment()` after the Supabase cache write. This ensures the income sheet sync fires. The call is non-blocking (fire-and-forget with `.catch()`).

**Files to change:**
- `src/components/desktop/DesktopClientRow.tsx` -- Add background `addPayment()` call in `handleSaveBookedPayment`
- `src/pages/ClientDetail.tsx` -- Same fix
- `src/components/dashboard/FreshClientCard.tsx` -- Same fix

---

## Technical Details

### Drawer z-index fix (drawer.tsx)
```
DrawerOverlay: z-50 -> z-[200]
DrawerContent: z-50 -> z-[200]
```

### Income sync fix (all 3 handleSaveBookedPayment locations)
After the Supabase cache write and local state update, add:
```typescript
// Background: call addPayment to trigger income sheet sync
addPayment(
  rowNum, data.amount, data.paymentType, data.nepaliDate, data.adDate, data.bank,
  existingPaid, existingDates, finalAmount, regId, clientName
).catch(err => {
  console.warn('[BACKGROUND] Income sync via addPayment failed:', err);
});
```

This preserves the Supabase-first instant update pattern while ensuring the INCOME WTN sheet sync still fires via the edge function's built-in income sync logic.
