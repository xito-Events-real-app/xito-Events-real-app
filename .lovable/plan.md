
# Global Status Change Interception: ADVANCE PENDING and BOOKED

## Overview

Implement a global interception system that triggers when a client's status is changed to **ADVANCE PENDING** or **BOOKED** from anywhere in the application. This ensures that:

1. **ADVANCE PENDING**: User must enter a Final Quotation (package + price)
2. **BOOKED**: User must enter an Advance Payment that gets saved to financial modules and "INCOME WTN" sheet

## Current State Analysis

Status changes currently occur in these locations:
- `src/pages/ClientDetail.tsx` - Client detail page
- `src/components/desktop/DesktopClientRow.tsx` - Desktop results table
- `src/components/dashboard/FreshClientCard.tsx` - Mobile Fresh/Handler clients cards

Each location already has a pattern for intercepting "QUOTATION SENT" transitions. The new feature will extend this pattern for "ADVANCE PENDING" and "BOOKED".

## Implementation Approach

### Data Flow

```text
User selects "ADVANCE PENDING" status
         |
         v
Intercept status change
         |
         v
Show Final Quotation Dialog
(Select package + enter final price)
         |
         v
Save Final Quotation (Column AD)
         |
         v
Update status to ADVANCE PENDING
         |
         v
Done
```

```text
User selects "BOOKED" status
         |
         v
Intercept status change
         |
         v
Show Advance Payment Dialog
(Select existing quotation or enter amount,
 choose payment type, bank, date)
         |
         v
Save Payment via addPayment()
(syncs to Finance modules + INCOME WTN)
         |
         v
Update status to BOOKED
         |
         v
Done
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ClientDetail.tsx` | Add interception for ADVANCE PENDING and BOOKED, add new dialogs |
| `src/components/desktop/DesktopClientRow.tsx` | Add interception for ADVANCE PENDING and BOOKED, add new dialogs |
| `src/components/dashboard/FreshClientCard.tsx` | Add interception for ADVANCE PENDING and BOOKED, add new dialogs |

---

## Detailed Changes

### 1. ADVANCE PENDING Interception

When status changes to "ADVANCE PENDING":

**Dialog: "Lock Final Quotation"**
- Show existing quotations from `quotationData` (Column V) if available
- Allow selecting from existing quotes or manually entering
- User selects package (BASIC/STANDARD/PREMIUM/WTN SPECIAL)
- User enters final amount
- Save as: `"PREMIUM: NPR 85,000/-"` to Column AD
- Then proceed with status update

### 2. BOOKED Interception

When status changes to "BOOKED":

**Dialog: "Record Advance Payment"**
- Pre-fill amount from existing final quotation if available
- User enters advance payment amount
- User selects payment type (ADVANCE from dropdown)
- User selects bank/payment method
- User selects payment date (AD/BS picker)
- Call `addPayment()` API which:
  - Saves to Column AE (Payments Made)
  - Syncs to BOOKED CLIENTS sheet
  - Syncs to "INCOME WTN" sheet (already implemented)
- Then proceed with status update

### 3. State Variables to Add (per component)

```typescript
// For ADVANCE PENDING
const [showAdvancePendingDialog, setShowAdvancePendingDialog] = useState(false);
const [advancePendingPackage, setAdvancePendingPackage] = useState('');
const [advancePendingAmount, setAdvancePendingAmount] = useState('');
const [isSavingAdvancePending, setIsSavingAdvancePending] = useState(false);

// For BOOKED
const [showBookedPaymentDialog, setShowBookedPaymentDialog] = useState(false);
const [bookedPaymentAmount, setBookedPaymentAmount] = useState('');
const [bookedPaymentType, setBookedPaymentType] = useState('ADVANCE');
const [bookedPaymentBank, setBookedPaymentBank] = useState('');
const [bookedPaymentDate, setBookedPaymentDate] = useState<Date | null>(null);
const [bookedPaymentBSDate, setBookedPaymentBSDate] = useState<{year: number; month: number; day: number} | null>(null);
const [isSavingBookedPayment, setIsSavingBookedPayment] = useState(false);
```

### 4. Status Change Handler Logic

```typescript
const handleStatusChange = async (newStatus: string) => {
  // Existing QUOTATION SENT interception...
  
  // NEW: Intercept ADVANCE PENDING
  const isToAdvancePending = newStatus.toUpperCase().includes('ADVANCE PENDING');
  if (isToAdvancePending) {
    setPendingStatus(newStatus);
    // Pre-fill from existing quotations if available
    const existingQuotes = parseQuotationData(client.quotationData);
    if (existingQuotes.length > 0) {
      // Pre-select first available quote
    }
    setShowAdvancePendingDialog(true);
    return;
  }
  
  // NEW: Intercept BOOKED (but not BOOKED SOMEWHERE ELSE)
  const isToBooked = newStatus.toUpperCase().includes('BOOKED') && 
                     !newStatus.toUpperCase().includes('SOMEWHERE ELSE');
  if (isToBooked) {
    setPendingStatus(newStatus);
    // Pre-fill from final quotation if exists
    const parsed = parseFinalQuotation(client.finalQuotation);
    if (parsed) {
      // Suggest a default advance amount
    }
    setShowBookedPaymentDialog(true);
    return;
  }
  
  // Continue normal flow...
};
```

### 5. Dialog UI for ADVANCE PENDING

```text
+-------------------------------------------+
| Lock Final Quotation                      |
+-------------------------------------------+
| Confirm the final package for [Client]    |
|                                           |
| EXISTING QUOTATIONS (if any):             |
| +-------------------------------------+   |
| | o BASIC: NPR 40,000/-               |   |
| | o STANDARD: NPR 60,000/-            |   |
| | o PREMIUM: NPR 85,000/- <- click    |   |
| +-------------------------------------+   |
|                                           |
| SELECT PACKAGE:                           |
| [BASIC] [STANDARD] [PREMIUM] [WTN SPEC]   |
|                                           |
| FINAL AMOUNT:                             |
| NPR [_________85,000_________] /-         |
|                                           |
| [Cancel]           [Lock & Move to        |
|                     Advance Pending]      |
+-------------------------------------------+
```

### 6. Dialog UI for BOOKED (Advance Payment)

```text
+-------------------------------------------+
| Record Advance Payment                    |
+-------------------------------------------+
| Book [Client] with advance payment        |
|                                           |
| FINAL PACKAGE:                            |
| PREMIUM: NPR 85,000/- (already set)       |
|                                           |
| ADVANCE AMOUNT:                           |
| NPR [__________30,000__________] /-       |
|                                           |
| PAYMENT TYPE:                             |
| [ADVANCE v]                               |
|                                           |
| BANK/METHOD:                              |
| [Select Bank v]                           |
|                                           |
| PAYMENT DATE:                             |
| [AD/BS Calendar Picker]                   |
| Jan 26, 2025 (2081 Magh 13)               |
|                                           |
| [Cancel]    [Record Payment & Book]       |
+-------------------------------------------+
```

---

## API Functions Used

| Function | Purpose |
|----------|---------|
| `updateFinalQuotation()` | Save final quote to Column AD |
| `addPayment()` | Record advance payment (syncs to Finance + INCOME WTN) |
| `updateClientStatus()` | Update status after data is saved |
| `parseQuotationData()` | Parse existing quotations for pre-fill |
| `parseFinalQuotation()` | Parse existing final quote |

---

## Technical Notes

1. **Payment Sync**: The `addPayment()` API already handles two-way sync between CLIENT TRACKER and BOOKED CLIENTS sheets, plus syncing to the "INCOME WTN" sheet in WTN INCOME & EXPENSES spreadsheet. No backend changes needed.

2. **Date Handling**: The BOOKED dialog will use the existing `PaymentDatePicker` component which supports AD/BS toggle.

3. **Dropdown Data**: Payment types and banks will be fetched from the existing `useDropdownData` hook.

4. **Error Handling**: If final quotation save or payment save fails, the status change will be aborted and user notified.

5. **Cache Update**: After successful status change, all local state and IndexedDB cache will be updated to reflect the changes.

---

## User Flow Summary

| Status Transition | Required Action | Data Saved |
|-------------------|-----------------|------------|
| Any -> ADVANCE PENDING | Enter Final Quotation | Column AD |
| Any -> BOOKED | Enter Advance Payment | Columns AE, AF, AG + INCOME WTN |

Both dialogs will show existing data for reference (quotations, final quote) to help the user make informed decisions quickly.
