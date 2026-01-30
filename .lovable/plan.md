
# Plan: Global Status Change Interception Dialogs

## Overview

This plan implements mandatory data entry dialogs when changing client status across the entire application. Currently, some components have partial interceptions while others are missing them entirely. This plan will ensure **consistent behavior globally**.

---

## Current State Analysis

| Component | QUOTATION SENT | ADVANCE PENDING | BOOKED |
|-----------|----------------|-----------------|--------|
| **ClientDetail.tsx** | From QUOTATION PENDING only | Has dialog | Has dialog |
| **DesktopClientRow.tsx** | From QUOTATION PENDING only | Has dialog | Has dialog |
| **FreshClientCard.tsx** | From QUOTATION PENDING only | MISSING | MISSING |

### Issues to Fix:
1. **QUOTATION SENT** - Currently only triggers when coming FROM "QUOTATION PENDING". User wants it to trigger **always** when changing to QUOTATION SENT
2. **FreshClientCard.tsx** - Missing ADVANCE PENDING and BOOKED interception dialogs entirely
3. Need to create a reusable **QuotationSentDialog** component for consistency

---

## User Requirements

| Status Change | Required Data | Column |
|---------------|---------------|--------|
| **QUOTATION SENT : REVIEW PENDING** | Quotation amounts for tiers (BASIC, STANDARD, PREMIUM, WTN SPECIAL) | Column V |
| **ADVANCE PENDING** | Final fixed quotation (Package + Price) | Column AD |
| **BOOKED** | Final quotation (if not set) + Advance payment amount | Columns AD, AE, AF, AG |

---

## Changes Required

### 1. Create New Component: `QuotationSentDialog`
**File**: `src/components/status-dialogs/QuotationSentDialog.tsx`

New reusable dialog component for capturing quotation amounts when transitioning to QUOTATION SENT:
- Input fields for BASIC, STANDARD, PREMIUM, WTN SPECIAL tiers
- NPR formatting with preview
- At least one tier must have a value
- Cancel and Save buttons

```text
Props:
- open: boolean
- onOpenChange: (open: boolean) => void
- clientName: string
- existingQuotationData?: string
- onSave: (quotationData: string) => Promise<void>
- isSaving: boolean
```

### 2. Update Status Dialogs Index
**File**: `src/components/status-dialogs/index.ts`

Export the new QuotationSentDialog component.

### 3. Update `ClientDetail.tsx`
**File**: `src/pages/ClientDetail.tsx`

Changes:
- Remove the condition that only intercepts from QUOTATION PENDING
- Trigger QUOTATION SENT dialog for **any** status change to QUOTATION SENT
- Replace inline dialog with new `QuotationSentDialog` component

**Before:**
```typescript
if (isFromQuotationPending && isToQuotationSent) {
  // Only triggers from QUOTATION PENDING
}
```

**After:**
```typescript
if (isToQuotationSent) {
  // Always trigger regardless of source status
}
```

### 4. Update `DesktopClientRow.tsx`
**File**: `src/components/desktop/DesktopClientRow.tsx`

Same changes as ClientDetail:
- Remove the "from QUOTATION PENDING" condition
- Always show quotation dialog when changing to QUOTATION SENT
- Use new `QuotationSentDialog` component

### 5. Update `FreshClientCard.tsx` (Major Update)
**File**: `src/components/dashboard/FreshClientCard.tsx`

Add missing interception dialogs:

**a) QUOTATION SENT Interception:**
- Remove "from QUOTATION PENDING" condition
- Show quotation dialog for any change to QUOTATION SENT

**b) ADVANCE PENDING Interception:**
- Add state: `showAdvancePendingDialog`, `isSavingAdvancePending`
- Import and use `FinalQuotationDialog` component
- Intercept status change to ADVANCE PENDING
- Require final quotation before status change

**c) BOOKED Interception:**
- Add state: `showBookedPaymentDialog`, `isSavingBookedPayment`
- Import and use `AdvancePaymentDialog` component
- Intercept status change to BOOKED (not BOOKED SOMEWHERE ELSE)
- Require advance payment before status change

---

## Technical Details

### New QuotationSentDialog Component Structure

```typescript
interface QuotationSentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  existingQuotationData?: string;
  onSave: (quotationData: string) => Promise<void>;
  isSaving: boolean;
}

// Features:
// - Pre-fills existing quotation amounts if available
// - Input validation (at least one tier required)
// - NPR formatting with live preview
// - Consistent styling with other status dialogs
```

### Status Change Flow (After Implementation)

```text
User Selects Status Change
          │
          ▼
    ┌─────────────────────────────┐
    │  Is target QUOTATION SENT?  │──────Yes────▶ Show QuotationSentDialog
    └─────────────────────────────┘               │
                                                  ▼
          │                                   Save quotation data
          │                                   Then change status
          │                                       │
          ▼                                       │
    ┌─────────────────────────────┐               │
    │  Is target ADVANCE PENDING? │──────Yes────▶ Show FinalQuotationDialog
    └─────────────────────────────┘               │
                                                  ▼
          │                                   Lock final quotation
          │                                   Then change status
          │                                       │
          ▼                                       │
    ┌─────────────────────────────┐               │
    │    Is target BOOKED?        │──────Yes────▶ Show AdvancePaymentDialog
    │  (not SOMEWHERE ELSE)       │               │
    └─────────────────────────────┘               ▼
                                              Record payment
          │                                   Move to BOOKED CLIENTS
          │                                   Delete from TRACKER
          ▼                                       │
    ┌─────────────────────────────┐               │
    │  Normal status change       │◀──────────────┘
    │  (no dialog required)       │
    └─────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/status-dialogs/QuotationSentDialog.tsx` | **NEW** - Create reusable quotation entry dialog |
| `src/components/status-dialogs/index.ts` | Export new QuotationSentDialog |
| `src/pages/ClientDetail.tsx` | Remove "from QUOTATION PENDING" condition, use new dialog component |
| `src/components/desktop/DesktopClientRow.tsx` | Remove "from QUOTATION PENDING" condition, use new dialog component |
| `src/components/dashboard/FreshClientCard.tsx` | Add all three interception dialogs (QUOTATION SENT, ADVANCE PENDING, BOOKED) |

---

## Expected Behavior After Implementation

### When changing to QUOTATION SENT:
1. Dialog opens asking for quotation amounts
2. User enters amounts for at least one tier (BASIC, STANDARD, PREMIUM, WTN SPECIAL)
3. Data saved to Column V
4. Status changes to QUOTATION SENT : REVIEW PENDING

### When changing to ADVANCE PENDING:
1. Dialog opens asking for final fixed quotation
2. User selects package (BASIC/STANDARD/PREMIUM/WTN SPECIAL) and enters final amount
3. Data saved to Column AD
4. Status changes to ADVANCE PENDING

### When changing to BOOKED:
1. Dialog checks if final quotation exists
2. If not set, shows warning but allows payment entry
3. User enters advance payment amount, type, bank, and date
4. Payment saved to Columns AE, AF, AG
5. Status changes to BOOKED
6. Client MOVES from CLIENT TRACKER to BOOKED CLIENTS sheet

---

## Notes

- All dialogs prevent status change until required data is entered
- Cancel button allows user to abort the status change
- Existing data pre-fills the dialogs when available
- Consistent UI styling across all dialogs
