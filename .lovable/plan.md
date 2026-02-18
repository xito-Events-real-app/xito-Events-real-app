
# `computePaymentUpdate` — Exact Format Specification & Implementation Plan

## Format Audit: What the Backend Produces (Verified Line-by-Line)

### The Canonical String (Backend `addPayment`, line 3700-3701)
```
NPR 30,000/- AS ADVANCE ON SUN 2082-10-04 IN MASTER BARUN
```

Every component of this string is now verified:

| Component | Backend Code | Frontend Must Replicate |
|---|---|---|
| Amount prefix | `NPR ` (with space) | `NPR ` |
| Amount | `parseInt(paymentAmount).toLocaleString('en-IN')` | `parseInt(amount).toLocaleString('en-IN')` — **commas ARE included** |
| Amount suffix | `/-` (no space before) | `/-` |
| Separator | ` AS ` | ` AS ` |
| Payment type | passed as-is (e.g. `ADVANCE`) | uppercase exactly |
| Separator | ` ON ` | ` ON ` |
| Weekday | `weekdays[adDateObj.getDay()]` using `new Date(yearPart, monthPart-1, dayPart)` | Must replicate this exact Date constructor (local timezone, not UTC) |
| Date | `nepaliDate` = BS date string `YYYY-MM-DD` | BS date string passed in |
| Separator | ` IN ` | ` IN ` |
| Bank | `bank` as passed | uppercase, as-is |

### Why Commas Are Mandatory

All three parsing regexes in the codebase use `[\d,]+` to capture the amount group:

- **`getTotalPaid()`** in `client-card-utils.ts` line 437: `/NPR\s*([\d,]+)\s*\/-/gi` — captures digits+commas, then strips commas for parsing. If commas are missing, the regex still matches, but **the display `amount` field in `ParsedPayment` would show without commas**. More critically, `toLocaleString('en-IN')` is the standard throughout the codebase.
- **`parsePayments()`** in `client-card-utils.ts` line 772: same `[\d,]+` group.
- **`parsePayments()`** in `PaymentHistorySheet.tsx` line 65: same `[\d,]+` group.
- **Backend re-parse** at line 3722: `/NPR\s*([\d,]+)\s*\/-/i` — same pattern used when recalculating totals on subsequent payment additions.

**Verdict: commas MUST be present.** The format is `NPR X,XXX/-` (with en-IN locale commas). This matches the backend exactly.

### `updatePayment` Difference: Bank is Uppercased
In `updatePaymentEntry` (line 3907), the bank is stored as `${newBank.toUpperCase()}`. The `addPayment` flow does not uppercase the bank — it uses the value as passed. The utility should not uppercase the bank (for `addPayment` parity), but this is noted for the `updatePayment` path.

### Weekday Derivation — Critical Detail
Backend at lines 3694-3697:
```typescript
const [yearPart, monthPart, dayPart] = nepaliDateAD.split('-').map(Number);
const adDateObj = new Date(yearPart, monthPart - 1, dayPart); // LOCAL timezone constructor
const weekday = weekdays[adDateObj.getDay()];
```
This uses `new Date(year, month-1, day)` — **not** `new Date('YYYY-MM-DD')`. The string constructor would parse as UTC and cause a 1-day offset in some timezones. The frontend utility must replicate the **local timezone constructor** exactly.

### Payment Entry Order: Append, Not Prepend
Backend line 3704-3706: new entries are **appended** (newest at the bottom):
```typescript
const updatedPaymentsMade = existingPaymentsMade 
  ? `${existingPaymentsMade}\n${newPaymentEntry}` 
  : newPaymentEntry;
```
This is the **opposite** of status logs and comments which prepend (newest at top). The utility must append.

---

## Dry Run: `computePaymentUpdate` Logic (3 Bullets)

- Parse `nepaliDateAD` (format `YYYY-MM-DD`) into year/month/day parts, construct `new Date(year, month-1, day)` using the local timezone constructor, look up `['SUN','MON','TUE','WED','THU','FRI','SAT'][date.getDay()]` to get the weekday abbreviation — exactly matching the backend's derivation
- Format the amount as `NPR ${parseInt(paymentAmount).toLocaleString('en-IN')}/-`, build the full entry string `NPR X,XXX/- AS TYPE ON WEEKDAY YYYY-MM-DD IN BANK`, then append to `existingPaymentsMade` with `\n` separator (newest at bottom, matching backend line 3704) and append to `existingPaymentDatesAD` with `\n`
- Parse all lines from the newly-updated `updatedPaymentsMade` using the regex `/NPR\s*([\d,]+)\s*\/-/i` (same as `getTotalPaid()`), sum to get `totalPaid`, compute `remaining = finalQuotationAmount - totalPaid`, format remaining as `NPR ${remaining.toLocaleString('en-IN')}/-`

---

## Impact Analysis

### File Modified: `src/lib/timestamp-utils.ts`
**Change:** Add `computePaymentUpdate()` export — new function only, zero changes to existing code.

**Potential breakage:** None. This is a pure utility function with no side effects. It does not import or modify any existing module.

**Affected consumers (once wired up in subsequent steps):**
- `src/components/booked/PaymentDrawer.tsx` — will call this instead of awaiting the edge function for UI state
- `src/components/finance/PaymentDrawer.tsx` — same
- `src/components/desktop/DesktopClientRow.tsx` — `handleSaveBookedPayment`
- `src/pages/ClientDetail.tsx` — `handleSaveBookedPayment`

None of those files are modified in this step. The function is created here and wired in later steps.

---

## Exact Function Signature and Implementation

```typescript
/**
 * Compute a payment update locally — mirrors the backend addPayment logic exactly.
 *
 * String format produced: "NPR X,XXX/- AS TYPE ON WEEKDAY YYYY-MM-DD IN BANK"
 * - Amount: toLocaleString('en-IN') — commas ARE included (e.g. "30,000")
 * - Weekday: derived from nepaliDateAD using local-timezone Date constructor
 *            new Date(year, month-1, day) — NOT new Date('YYYY-MM-DD') (UTC would offset by 1 day)
 * - New entry is APPENDED (not prepended) — newest payment is at the bottom
 * - Remaining format: "NPR X,XXX/-"
 *
 * This matches backend addPayment lines 3693-3736 exactly.
 */
export function computePaymentUpdate(params: {
  paymentAmount: string;          // Raw amount string or number, e.g. "30000" or "30,000"
  paymentType: string;            // e.g. "ADVANCE", "PARTIAL", "FINAL"
  nepaliDate: string;             // BS date "YYYY-MM-DD"
  nepaliDateAD: string;           // AD date "YYYY-MM-DD" — used for weekday derivation
  bank: string;                   // e.g. "MASTER BARUN", "ESEWA"
  existingPaymentsMade: string;   // Current Column AE value
  existingPaymentDatesAD: string; // Current Column AF value
  finalQuotationAmount: number;   // Parsed integer, e.g. 120000
}): {
  updatedPaymentsMade: string;    // New Column AE value (ready to write to Supabase + Sheets)
  updatedPaymentDatesAD: string;  // New Column AF value
  remainingPayment: string;       // Formatted "NPR X,XXX/-" for Column AG
  totalPaid: number;              // Integer sum of all payments including new one
}
```

### Implementation Details

**Step 1 — Weekday derivation (local timezone, matching backend lines 3694-3697):**
```typescript
const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const [yearPart, monthPart, dayPart] = params.nepaliDateAD.split('-').map(Number);
const adDateObj = new Date(yearPart, monthPart - 1, dayPart); // Local timezone, not UTC
const weekday = weekdays[adDateObj.getDay()];
```

**Step 2 — Format amount and build entry string (matching backend lines 3700-3701):**
```typescript
const numericAmount = parseInt(String(params.paymentAmount).replace(/,/g, ''), 10);
const formattedAmount = `NPR ${numericAmount.toLocaleString('en-IN')}/-`;
const newPaymentEntry = `${formattedAmount} AS ${params.paymentType} ON ${weekday} ${params.nepaliDate} IN ${params.bank}`;
```

**Step 3 — Append to existing (matching backend lines 3704-3711):**
```typescript
const updatedPaymentsMade = params.existingPaymentsMade
  ? `${params.existingPaymentsMade}\n${newPaymentEntry}`
  : newPaymentEntry;

const updatedPaymentDatesAD = params.existingPaymentDatesAD
  ? `${params.existingPaymentDatesAD}\n${params.nepaliDateAD}`
  : params.nepaliDateAD;
```

**Step 4 — Recalculate totals (matching backend lines 3717-3736):**
```typescript
const allPayments = updatedPaymentsMade.split('\n').filter(Boolean);
let totalPaid = 0;
for (const entry of allPayments) {
  const match = entry.match(/NPR\s*([\d,]+)\s*\/-/i);
  if (match) {
    totalPaid += parseInt(match[1].replace(/,/g, ''), 10);
  } else {
    const fallbackMatch = entry.match(/NPR\s*([\d,]+)/i);
    if (fallbackMatch) {
      totalPaid += parseInt(fallbackMatch[1].replace(/,/g, ''), 10);
    }
  }
}
const remaining = finalQuotationAmount - totalPaid;
const remainingPayment = `NPR ${remaining.toLocaleString('en-IN')}/-`;
```

---

## File to Modify

| File | Change |
|---|---|
| `src/lib/timestamp-utils.ts` | ADD `computePaymentUpdate()` — pure utility, no changes to existing functions |

No other files are touched in this step. The wiring of this utility into `PaymentDrawer`, `DesktopClientRow`, and `ClientDetail` is part of the subsequent migration steps.
