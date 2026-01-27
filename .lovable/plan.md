

## Add Payment Copy to WTN INCOME & EXPENSES Spreadsheet

This plan syncs payments from the Finance Manager to a separate "WTN INCOME & EXPENSES" spreadsheet for income tracking.

---

### Setup Required

A new backend secret is needed to store the spreadsheet ID:

**New Secret:** `WTN_INCOME_EXPENSES_SPREADSHEET_ID`

You'll need to:
1. Open your "WTN INCOME & EXPENSES" spreadsheet in Google Sheets
2. Copy the spreadsheet ID from the URL (the long string between `/d/` and `/edit`)
3. Make sure the spreadsheet is shared with the service account email (same one used for the main tracker)

---

### Target Sheet Structure

**Sheet:** "INCOME WTN" in WTN INCOME & EXPENSES spreadsheet

| Column | Content | Example |
|--------|---------|---------|
| A | AD Date | 2026-01-27 |
| B | BS Date | 2082-10-14 |
| C | Type (static) | INCOME |
| D | Payment Category | CLIENT ADVANCE / CLIENT PARTIAL PAYMENT / CLIENT FINAL PAYMENT |
| E | Amount | 30000 |
| F | Bank/Payment Method | MASTER BENZO |
| G | Statement | Amrita Didi - PARTIAL AMOUNT PAID - NPR 30,000/-, REMAINING NPR 45,000/- |

---

### Payment Type Mapping

| Original | Saved As |
|----------|----------|
| ADVANCE | CLIENT ADVANCE |
| PARTIAL | CLIENT PARTIAL PAYMENT |
| FINAL | CLIENT FINAL PAYMENT |

---

### Implementation Changes

#### 1. Add New Secret
**Action:** Use secret tool to request `WTN_INCOME_EXPENSES_SPREADSHEET_ID`

#### 2. Update Edge Function
**File:** `supabase/functions/google-sheets/index.ts`

Modify the `addPayment` handler to:
- Accept `clientName` parameter from frontend
- After primary payment sync, append row to "INCOME WTN" sheet
- Use the new `WTN_INCOME_EXPENSES_SPREADSHEET_ID` secret

```typescript
// After primary payment update succeeds
const incomeSpreadsheetId = Deno.env.get('WTN_INCOME_EXPENSES_SPREADSHEET_ID');
if (incomeSpreadsheetId) {
  // Map payment type
  const categoryMap = {
    'ADVANCE': 'CLIENT ADVANCE',
    'PARTIAL': 'CLIENT PARTIAL PAYMENT', 
    'FINAL': 'CLIENT FINAL PAYMENT'
  };
  
  // Build statement
  const statement = `${clientName} - ${paymentType.toUpperCase()} AMOUNT PAID - NPR ${amount}/-, REMAINING ${remaining}`;
  
  // Append to INCOME WTN sheet
  const rowValues = [[adDate, bsDate, 'INCOME', category, amount, bank, statement]];
  // ... append using Google Sheets API
}
```

#### 3. Update API Function Signature
**File:** `src/lib/sheets-api.ts`

Add `clientName` parameter to `addPayment`:
```typescript
export async function addPayment(
  rowNumber: number,
  paymentAmount: string,
  paymentType: string,
  nepaliDate: string,
  nepaliDateAD: string,
  bank: string,
  existingPaymentsMade: string,
  existingPaymentDatesAD: string,
  finalQuotationAmount: number,
  registeredDateTimeAD?: string,
  sourceSheet?: 'tracker' | 'booked',
  clientName?: string  // NEW
)
```

#### 4. Update Payment Drawers
**Files:** 
- `src/components/finance/PaymentDrawer.tsx`
- `src/components/booked/PaymentDrawer.tsx`

Pass `clientName` prop to the `addPayment` call.

---

### Files to Modify

| File | Change |
|------|--------|
| Backend Secret | Add `WTN_INCOME_EXPENSES_SPREADSHEET_ID` |
| `supabase/functions/google-sheets/index.ts` | Add income sheet sync in `addPayment` |
| `src/lib/sheets-api.ts` | Add `clientName` parameter |
| `src/components/finance/PaymentDrawer.tsx` | Pass `clientName` to API |
| `src/components/booked/PaymentDrawer.tsx` | Pass `clientName` to API |

---

### Error Handling

- If `WTN_INCOME_EXPENSES_SPREADSHEET_ID` is not set, sync is skipped silently
- If income sheet sync fails, primary payment still succeeds (logged but not blocking)
- This ensures the main payment functionality is never disrupted

---

### Prerequisites

Before implementation, you need to:
1. Share the "WTN INCOME & EXPENSES" spreadsheet with the service account email
2. Provide the spreadsheet ID when prompted

