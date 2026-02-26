

# Fix: Status Not Updating in UI + Double Sheet Entries

## Two Root Causes

1. **UI stuck on old status**: `FreshClientCard` initializes local state from props once (`useState(client.statusLog || '')`). When the parent updates the client after a status change, the card ignores the new prop because React `useState` only reads the initial value on mount. No `useEffect` exists to sync prop changes back to local state.

2. **Double Sheets entry**: `confirmStatusChange` writes to Supabase cache with `synced_to_sheet: false` AND fires a direct background `updateClientStatus()` to Sheets. The background sync process later finds the unsynced row and pushes it again -- resulting in two identical entries.

## Changes

### File: `src/components/dashboard/FreshClientCard.tsx`

**1. Add useEffect to sync props to local state** (after the state declarations, around line 424)

```typescript
useEffect(() => {
  setCurrentStatusLog(client.statusLog || '');
  setCurrentHandler(client.clientHandler || '');
  setCurrentCallLog(client.callLog || '');
  setCurrentMindset(client.mindset || '');
  setCurrentQuotationData(client.quotationData || '');
  setCurrentOurBargainedRates(client.ourBargainedRates || '');
  setCurrentClientBargainedRates(client.clientBargainedRates || '');
  setCurrentComments(client.comments || '');
  setCurrentFinalQuotation(client.finalQuotation || '');
  setCurrentPaymentsMade(client.paymentsMade || '');
  setCurrentPaymentDatesAD(client.paymentDatesAD || '');
  setCurrentRemainingPayment(client.remainingPayment || '');
}, [client]);
```

**2. Remove direct Sheets calls** -- let background sync handle it (one write, not two)

- `confirmStatusChange` (line 526-527): Remove `updateClientStatus(client.rowNumber, ...).catch(...)` 
- `handleSaveQuotation`: Remove `updateClientQuotation(...)` background call
- `handleSaveAdvancePendingQuotation`: Remove `updateFinalQuotation(...)` and `updateClientStatus(...)` background calls
- `handleSaveBookedPayment`: Remove `addPayment(...)` and `updateClientStatus(...)` background calls

All these already write to Supabase cache with `synced_to_sheet: false`, so the background push sync will handle Sheets updates exactly once.

**3. Apply Supabase-first to `handleHandlerChange`** (line 543+)

Currently still awaits `updateClientHandler()` (Sheets-first, blocking). Change to: update local state instantly, write to Supabase cache, no direct Sheets call.

## Expected Result
- Status changes reflect in UI instantly (no stale state)
- Only one entry appears in Google Sheets per status change
- All writes flow: local state -> Supabase cache -> background sync to Sheets

