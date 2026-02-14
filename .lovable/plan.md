
# Fix: Event Data Not Showing After Edit + Sync Button Fix

## Problem
1. After editing events in the Quick Add form, data saves to Google Sheets correctly but the Client Detail page shows stale event data because `useEventDetails` (which fetches from the logistics sheet) is never re-triggered.
2. The Sync button refreshes client data but does NOT refresh event details from the logistics sheet.
3. `DashboardEventDetails` prioritizes `eventDetailsData` (logistics sheet) over `clientEvents` (client record), so even when the client record updates, stale logistics data takes precedence.

## Root Cause
The `refetchEventDetails` function is destructured from `useEventDetails` on line 292 of `ClientDetail.tsx` but is **never called anywhere** -- not after editing, not after syncing.

## Solution

### File: `src/pages/ClientDetail.tsx`

**1. Sync button fix** -- Add `refetchEventDetails()` call inside `handleSyncClient`:

```typescript
const handleSyncClient = async () => {
  if (!client?.registeredDateTimeAD) return;
  
  setIsSyncingClient(true);
  try {
    const freshClient = await getSingleClient(client.registeredDateTimeAD);
    if (freshClient && updateClientCache) {
      updateClientCache(freshClient);
      setCurrentStatusLog(freshClient.statusLog || '');
      setCurrentPaymentsMade(freshClient.paymentsMade || '');
      setCurrentRemainingPayment(freshClient.remainingPayment || '');
      setCurrentComments(freshClient.comments || '');
      setCurrentQuotationData(freshClient.quotationData || '');
      setCurrentFinalQuotation(freshClient.finalQuotation || '');
      toast({ title: "Client data synced from sheets" });
    }
    // Also refresh event details from logistics sheet
    await refetchEventDetails();
  } catch (err) {
    // ... error handling
  } finally {
    setIsSyncingClient(false);
  }
};
```

**2. Post-edit refresh** -- Add an effect that triggers `refetchEventDetails()` when the client's event fields change (which happens when returning from the QuickAdd edit form):

```typescript
useEffect(() => {
  if (client?.events) {
    refetchEventDetails();
  }
}, [client?.events, client?.eventYear, client?.eventMonth, client?.eventDay]);
```

This ensures that whenever the cached client's event data changes (after an edit), the logistics sheet data is also re-fetched to stay in sync.

### Files Modified
- `src/pages/ClientDetail.tsx` (2 small changes: add `refetchEventDetails()` to sync handler + add useEffect for post-edit refresh)
