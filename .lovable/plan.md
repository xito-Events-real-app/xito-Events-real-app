
## Fix: Quotation Data Parsing for Newline-Delimited Data

This fix addresses the critical bug where quotation data like "STANDARD: NPR 40,000/-\nPREMIUM: NPR 50,000/-" is not being parsed correctly because the parser only looks for pipe (`|`) delimiters.

---

### Root Cause

```text
DATA FORMAT (in Google Sheets):
STANDARD: NPR 40,000/-
PREMIUM: NPR 50,000/-

STORED AS (with newline delimiter):
"STANDARD: NPR 40,000/-\nPREMIUM: NPR 50,000/-"

CURRENT PARSER (client-card-utils.ts line 260):
data.split('|')  ← Only looks for pipes, IGNORES newlines!

RESULT:
- Returns entire string as ONE part
- Regex match fails or only catches first tier
- Shows 1 quotation or triggers "Add Quotation" prompt incorrectly
```

---

### The Fix

**Single line change in `src/lib/client-card-utils.ts`**

Update line 260 to split by BOTH pipe and newline:

```typescript
// BEFORE:
const parts = data.split('|').map(p => p.trim()).filter(Boolean);

// AFTER:
const parts = data.split(/[|\n]/).map(p => p.trim()).filter(Boolean);
```

The regex `[|\n]` creates a character class that matches either:
- `|` (pipe character)
- `\n` (newline character)

This ensures backward compatibility with any existing data using pipes while fixing the newline format.

---

### File Change

| File | Line | Change |
|------|------|--------|
| `src/lib/client-card-utils.ts` | 260 | Change `split('|')` to `split(/[|\n]/)` |

---

### Before/After Example

```text
INPUT: "STANDARD: NPR 40,000/-\nPREMIUM: NPR 50,000/-"

BEFORE (broken):
parts = ["STANDARD: NPR 40,000/-\nPREMIUM: NPR 50,000/-"]
Result: Only first tier matched OR none matched

AFTER (fixed):
parts = ["STANDARD: NPR 40,000/-", "PREMIUM: NPR 50,000/-"]
Result: Both tiers correctly parsed and displayed
```

---

### Testing Verification

After the fix, for client "Amrita Didi":
1. Both STANDARD and PREMIUM tiers will display
2. No more "Add Quotation" prompt when data exists
3. Consistent display across all views (mobile, desktop, detail page)

---

### Summary

This is a **one-line fix** that resolves the critical quotation parsing issue by updating the delimiter pattern from pipe-only to pipe-or-newline, ensuring all existing and new quotation data displays correctly.
