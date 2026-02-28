

# Fix: Status Change (and all actions) Failing for Newly Added Clients

## Root Cause

Every action handler in `src/pages/ClientDetail.tsx` starts with:

```typescript
if (!client?.rowNumber) return;
```

For newly added clients (like "Ashmita Poudel"), `rowNumber` is `0` (the default value when inserted into the database). In JavaScript, `!0` evaluates to `true`, so the function **silently exits** without doing anything -- no error, no toast, nothing happens.

This affects **all 10+ handlers**: status change, call logging, quotation save, bargaining, advance pending, booked payment, comment add, priority change, final quotation, Benzo Keep notes, and delete.

## Fix

### File: `src/pages/ClientDetail.tsx`

Replace all `if (!client?.rowNumber) return;` guards (approximately 10 occurrences) with:

```typescript
if (!client) return;
```

Since the system uses `registeredDateTimeAD` as the primary unique identifier (not `rowNumber`), the guard only needs to confirm the client object exists. The cache update functions already match by `registeredDateTimeAD` internally.

**Affected handlers (all ~10):**
- `handleCall` (line 364)
- `handleStatusChange` (line 397)
- `performStatusChange` (line 438)
- `handleSaveQuotation` (line 469)
- `handleSaveAdvancePendingQuotation` (line 515)
- `handleSaveBargaining` (line 550)
- `handleSaveFinalQuotationOnly` (line 599)
- `handleSaveBookedPayment` (around line 630+)
- `handlePriorityChange` (line 764)
- `handleAddComment` (wherever it is)
- `handleDeleteClient` (wherever it is)

This is the same class of bug -- `rowNumber` being `0` for new clients -- and the fix is a simple guard replacement across all handlers in the file.

