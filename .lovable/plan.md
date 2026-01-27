

## Add Purchase/Validity/Expiry/Price Columns to My Accounts

This plan adds 4 new columns from the "WTN ID PASSWORD" sheet to the My Accounts module with automatic expiry date calculation.

### Column Mapping (New)
| Column | Field | Description |
|--------|-------|-------------|
| M | Date of Purchase | When the account was purchased |
| N | Validity | Number of months the account is valid |
| O | Expiry Date | Calculated: Purchase Date + Validity months |
| P | Price | Cost of the account |

### Changes Overview

```text
+------------------+     +-------------------+     +------------------+
| Edge Function    | --> | accounts-api.ts   | --> | UI Components    |
| (fetch M-P cols) |     | (add interface)   |     | (display data)   |
+------------------+     +-------------------+     +------------------+
```

---

### Technical Details

#### 1. Edge Function Update
**File:** `supabase/functions/google-sheets/index.ts`

- Extend range from `A2:L` to `A2:P` to fetch new columns
- Add mapping for 4 new fields in the response object:
  - `dateOfPurchase` (Column M)
  - `validity` (Column N) - stored as months
  - `expiryDate` (Column O) - calculated if empty
  - `price` (Column P)

#### 2. Frontend Interface Update
**File:** `src/lib/accounts-api.ts`

Add 4 new properties to `AccountData` interface:
```typescript
dateOfPurchase: string;   // Column M
validity: string;         // Column N (months)
expiryDate: string;       // Column O
price: string;            // Column P
```

#### 3. Expiry Calculation Utility
**File:** `src/lib/accounts-api.ts`

Add helper function to calculate expiry date:
```typescript
// If expiryDate is empty, calculate from dateOfPurchase + validity months
function calculateExpiryDate(purchaseDate: string, validityMonths: number): string
```

#### 4. Mobile Card Update
**File:** `src/components/accounts/AccountCard.tsx`

Add a "Subscription" section showing:
- Price with NPR formatting
- Expiry status badge (Active/Expiring Soon/Expired)
- Visual indicator based on days until expiry

#### 5. Desktop Table Update
**File:** `src/components/accounts/AccountTable.tsx`

Add 2 new columns to the table:
- **Expiry** column showing expiry date with color-coded status
- **Price** column with NPR formatting

#### 6. Detail Sheet Update
**File:** `src/components/accounts/AccountDetailSheet.tsx`

Add new "Subscription Details" section with:
- Date of Purchase
- Validity period (e.g., "12 months")
- Expiry Date with status indicator
- Price

---

### Expiry Status Logic

The expiry date will be color-coded based on remaining days:
- **Green (Active):** More than 30 days remaining
- **Amber (Expiring Soon):** 1-30 days remaining  
- **Red (Expired):** Past expiry date

### Edge Cases Handled

1. **Missing data:** If columns M-P are empty, gracefully show "Not set"
2. **Missing expiry:** If Column O is empty but M and N exist, calculate automatically
3. **Invalid dates:** Handle various date formats from the sheet
4. **No validity:** If validity is empty/invalid, don't calculate expiry

