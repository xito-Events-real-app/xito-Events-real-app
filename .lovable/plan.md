

# Plan: Make BOOKED CLIENTS the Single Source of Truth for Payments

## Overview

This plan modifies the payment system so that **columns AE (Payments Made), AF (Payment Date), and AG (Remaining Payment)** are only stored in and read from the `BOOKED CLIENTS` sheet, eliminating the current two-way sync.

---

## Current Architecture (Before)

```text
                    ┌─────────────────┐
                    │  Add Payment    │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
   ┌──────────────────────┐      ┌──────────────────────┐
   │   CLIENT TRACKER     │      │   BOOKED CLIENTS     │
   │   (AE, AF, AG)       │◄────►│   (AE, AF, AG)       │
   └──────────────────────┘      └──────────────────────┘
              │                             │
              └──────────────┬──────────────┘
                             ▼
                    Full Resync copies
                    ALL data (including payments)
                    from Tracker → Booked
```

Problem: Two-way sync creates confusion, and full resync overwrites BOOKED CLIENTS payments.

---

## New Architecture (After)

```text
                    ┌─────────────────┐
                    │  Add Payment    │
                    └────────┬────────┘
                             │
                             ▼
   ┌──────────────────────┐      ┌──────────────────────┐
   │   CLIENT TRACKER     │      │   BOOKED CLIENTS     │
   │   (AE, AF, AG: EMPTY)│      │   (AE, AF, AG)       │ ◄── Single Source!
   └──────────────────────┘      └──────────────────────┘
              │                             │
              └──────────────┬──────────────┘
                             ▼
                    Full Resync skips
                    columns 30-32 (AE-AG)
```

---

## Changes Required

### 1. Backend: Modify `addPayment` Function
**File**: `supabase/functions/google-sheets/index.ts`

Current behavior:
- Writes payment data to BOTH sheets
- Uses `sourceSheet` parameter to determine primary sheet

New behavior:
- **ONLY write to `BOOKED CLIENTS`** for payment columns (AE, AF, AG)
- Remove the two-way sync logic for payment data
- Still sync to INCOME WTN sheet (this stays the same)

Changes:
- Remove the logic that syncs payment to CLIENT TRACKER
- Always use `BOOKED CLIENTS` as the target sheet for payment writes
- Keep the row lookup logic using `registeredDateTimeAD` but only for BOOKED CLIENTS

### 2. Backend: Modify `updatePaymentEntry` Function
**File**: `supabase/functions/google-sheets/index.ts`

Current behavior:
- Updates BOOKED CLIENTS, then syncs to CLIENT TRACKER

New behavior:
- **ONLY update `BOOKED CLIENTS`** 
- Remove the CLIENT TRACKER sync entirely

### 3. Backend: Modify `fullResyncAllBookedClients` Function
**File**: `supabase/functions/google-sheets/index.ts`

Current behavior:
- Copies ALL 35 columns (A-AI) from CLIENT TRACKER to BOOKED CLIENTS
- This overwrites payment data in BOOKED CLIENTS with (potentially empty) Tracker data

New behavior:
- **Skip columns 30, 31, 32** (indices for AE, AF, AG) when syncing
- Preserve existing BOOKED CLIENTS payment data during resync
- Still sync all other columns (A-AD, AH-AI)

### 4. Backend: Modify `updateBookedClient` Function  
**File**: `supabase/functions/google-sheets/index.ts`

Current behavior:
- Updates payment columns in BOTH sheets

New behavior:
- **Only update payment columns (AE, AF, AG) in BOOKED CLIENTS**
- Other fields can still sync to CLIENT TRACKER if needed

### 5. Frontend: Update API Call Parameters
**File**: `src/lib/sheets-api.ts`

- Remove `sourceSheet` parameter from `addPayment` (no longer needed)
- Simplify the API since we always target BOOKED CLIENTS for payments

---

## Technical Details

### Column Indices Reference
| Column | Letter | Index | Description |
|--------|--------|-------|-------------|
| AE | 30 | Payments Made log |
| AF | 31 | Payment Dates (AD format) |
| AG | 32 | Remaining Payment |

### Full Resync Column Skip Logic
```typescript
// In fullResyncAllBookedClients, when copying row data:
const PAYMENT_COLUMNS = [30, 31, 32]; // AE, AF, AG

// For each column comparison/copy:
for (let col = 0; col < 35; col++) {
  if (PAYMENT_COLUMNS.includes(col)) {
    // SKIP - preserve BOOKED CLIENTS payment data
    continue;
  }
  // Copy other columns from TRACKER to BOOKED
}
```

---

## Edge Cases Handled

1. **New Clients Copied to BOOKED CLIENTS**: When a client first gets status "BOOKED", they're copied to BOOKED CLIENTS with empty payment columns - this is correct, payments will be added later directly to BOOKED CLIENTS

2. **Existing Payment Data**: Clients who already have payments in BOOKED CLIENTS will have their data preserved during resyncs

3. **CLIENT TRACKER Payment Columns**: Will remain empty/unused for future clients - the system won't break, just won't be used for payments anymore

4. **Income Statement Sync**: The sync to WTN INCOME & EXPENSES sheet remains unchanged - this is a separate destination

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/google-sheets/index.ts` | Modify `addPayment`, `updatePaymentEntry`, `fullResyncAllBookedClients`, `updateBookedClient` |
| `src/lib/sheets-api.ts` | Simplify `addPayment` parameters (remove sourceSheet) |
| Multiple UI components | Update `addPayment` calls to remove `sourceSheet` parameter |

---

## Migration Notes

No data migration is needed. The change is backward-compatible:
- Existing payment data in BOOKED CLIENTS is preserved
- New payments only go to BOOKED CLIENTS
- Old payment data in CLIENT TRACKER remains but becomes stale/unused

