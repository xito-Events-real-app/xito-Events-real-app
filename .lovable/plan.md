
# Plan: Fix BOOKED Status Data Saving & Add Client Sync Button

## Problems Identified

### Problem 1: Payment & Final Quotation Not Saved When Setting BOOKED Status

**Root Cause Analysis:**

In `handleSaveBookedPayment` (lines 782-841 in `ClientDetail.tsx`), the execution order is WRONG:

```typescript
// CURRENT (BROKEN) ORDER:
// Step 1: addPayment() - tries to write to BOOKED CLIENTS sheet
const paymentResult = await addPayment(..., client.registeredDateTimeAD, ...);

// Step 2: updateClientStatus() - THIS is when client gets MOVED to BOOKED CLIENTS
const statusResult = await updateClientStatus(...);
```

The `addPayment()` function (line 2317-2347 in edge function) searches for the client in the BOOKED CLIENTS sheet using `registeredDateTimeAD`. But at this point, **the client hasn't been moved to BOOKED CLIENTS yet** (that happens in `updateClientStatus()`). So the payment lookup fails and data is lost.

### Problem 2: Final Quotation Not Validated Before Payment

The `AdvancePaymentDialog` only shows a warning if no final quotation is set (lines 140-146) but still allows the user to proceed. Without a valid final quotation:
- The remaining payment calculation is wrong (divides by 0 or uses 0)
- Data integrity is compromised

### Problem 3: No Sync Button for Individual Client

Currently there's no way to refresh a single client's data from Google Sheets.

---

## Solution Overview

### Fix 1: Correct Execution Order in handleSaveBookedPayment

Swap the order of operations:
1. **First**: Call `updateClientStatus()` to move the client to BOOKED CLIENTS sheet
2. **Second**: Call `addPayment()` to record payment in the now-existing BOOKED CLIENTS row

### Fix 2: Block Payment Without Final Quotation

Update `AdvancePaymentDialog` to:
- Disable the save button when no final quotation is set
- Show a clear error message instead of a warning
- Guide user to set final quotation via ADVANCE PENDING status first

### Fix 3: Add Client Sync Button

Add a sync button to the Client Detail page that:
- Fetches fresh data for this specific client from Google Sheets
- Updates the local cache and UI
- Shows loading state and feedback

---

## Detailed Changes

### File 1: `src/pages/ClientDetail.tsx`

**Change 1A: Fix execution order in handleSaveBookedPayment (lines 782-841)**

```typescript
// CORRECTED ORDER:
const handleSaveBookedPayment = async (data: {...}) => {
  if (!client?.rowNumber) return;
  
  const parsedFinal = parseFinalQuotation(currentFinalQuotation || client.finalQuotation || '');
  const finalAmount = parsedFinal ? parseInt(parsedFinal.amount.replace(/[^0-9]/g, '')) : 0;
  
  setIsSavingBookedPayment(true);
  try {
    // Step 1: Update status FIRST (moves client to BOOKED CLIENTS)
    const statusResult = await updateClientStatus(
      client.rowNumber, 
      pendingStatus, 
      currentStatusLog || client.statusLog || ''
    );
    setCurrentStatusLog(statusResult.statusLog);
    
    // Step 2: NOW add payment (client exists in BOOKED CLIENTS)
    const paymentResult = await addPayment(
      client.rowNumber,
      data.amount,
      data.paymentType,
      data.nepaliDate,
      data.adDate,
      data.bank,
      currentPaymentsMade || client.paymentsMade || '',
      client.paymentDatesAD || '',
      finalAmount,
      client.registeredDateTimeAD,
      client.clientName
    );
    
    // Update local state...
  }
};
```

**Change 1B: Add sync button and handler**

Add new state:
```typescript
const [isSyncingClient, setIsSyncingClient] = useState(false);
```

Add handler:
```typescript
const handleSyncClient = async () => {
  if (!client?.registeredDateTimeAD) return;
  
  setIsSyncingClient(true);
  try {
    const freshClient = await getSingleClient(client.registeredDateTimeAD);
    if (freshClient && updateClientCache) {
      updateClientCache(freshClient);
      // Update local state to reflect fresh data
      setCurrentStatusLog(freshClient.statusLog || '');
      setCurrentPaymentsMade(freshClient.paymentsMade || '');
      // ... other fields
    }
    toast({ title: "Client data synced from sheets" });
  } catch (err) {
    toast({ title: "Failed to sync client", variant: "destructive" });
  } finally {
    setIsSyncingClient(false);
  }
};
```

Add sync button to the UI (in the header/hero area).

---

### File 2: `src/components/status-dialogs/AdvancePaymentDialog.tsx`

**Change: Block save without final quotation**

Update the validation logic:
```typescript
// Add validation for final quotation requirement
const hasFinalQuotation = parsedFinal !== null;

// Update isValid check (line 102)
const isValid = hasFinalQuotation && 
                paymentAmount.trim() && 
                selectedPaymentType && 
                selectedBank && 
                selectedDate && 
                selectedBSDate;
```

Update the warning to be an error/blocker:
```typescript
{!hasFinalQuotation && (
  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive">
    <p className="text-sm text-destructive font-medium">
      ⛔ Final quotation is required before recording payment.
    </p>
    <p className="text-xs text-destructive/80 mt-1">
      Please set the status to "ADVANCE PENDING" first to lock the final quotation.
    </p>
  </div>
)}
```

---

### File 3: `src/lib/sheets-api.ts`

**Add new function for single client fetch:**

```typescript
export async function getSingleClient(registeredDateTimeAD: string): Promise<ClientData | null> {
  return callSheetsFunction<ClientData | null>("getSingleClient", {
    data: { registeredDateTimeAD },
  });
}
```

---

### File 4: `supabase/functions/google-sheets/index.ts`

**Add new action handler for getSingleClient:**

```typescript
async function getSingleClient(
  accessToken: string, 
  spreadsheetId: string, 
  registeredDateTimeAD: string
): Promise<Record<string, unknown> | null> {
  // Search in CLIENT TRACKER first
  const trackerClients = await searchInSheet(
    accessToken, spreadsheetId, 'CLIENT TRACKER', registeredDateTimeAD
  );
  if (trackerClients) return { ...trackerClients, _source: 'tracker' };
  
  // If not found, search in BOOKED CLIENTS
  const bookedClients = await searchInSheet(
    accessToken, spreadsheetId, 'BOOKED CLIENTS', registeredDateTimeAD
  );
  if (bookedClients) return { ...bookedClients, _source: 'booked' };
  
  return null;
}
```

Add to action handler and SheetRequest type.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ClientDetail.tsx` | 1. Swap order in `handleSaveBookedPayment` (status first, then payment) 2. Add `isSyncingClient` state 3. Add `handleSyncClient` function 4. Add Sync button to UI |
| `src/components/status-dialogs/AdvancePaymentDialog.tsx` | Block save button when no final quotation is set |
| `src/lib/sheets-api.ts` | Add `getSingleClient()` function |
| `supabase/functions/google-sheets/index.ts` | Add `getSingleClient` action to fetch single client by ID |

---

## Expected Behavior After Fix

### BOOKED Status Flow:
1. User clicks "BOOKED" status
2. `AdvancePaymentDialog` opens
3. If no final quotation: **Save button disabled**, error message shown
4. If final quotation exists: User enters payment, clicks Save
5. Status updates FIRST → client MOVES to BOOKED CLIENTS sheet
6. Payment recorded SECOND → data writes to correct row
7. Success!

### Sync Button:
1. User is on Client Detail page
2. Clicks "Sync" button in header
3. Loading spinner appears
4. Fresh data fetched from Google Sheets for this client
5. UI updates with latest data
6. Toast confirms sync complete

---

## Technical Notes

- The `addPayment` function uses `registeredDateTimeAD` to find the correct row in BOOKED CLIENTS (line 2317-2347 in edge function)
- After `updateClientStatus()` is called with "BOOKED", the client is:
  1. Copied to BOOKED CLIENTS sheet (line 1232)
  2. Deleted from CLIENT TRACKER (line 1236)
- The `getSingleClient` function needs to search both sheets since the client may be in either one depending on their status
