

# Fix Status Change: Apply Supabase-First Pattern to FreshClientCard

## Problem Found

After investigating all three status-change flows, here's the inconsistency:

| Component | Pattern | Status Change Speed |
|-----------|---------|-------------------|
| `ClientDetail.tsx` | Supabase-first (correct) | Instant |
| `DesktopClientRow.tsx` | Supabase-first (correct) | Instant |
| **`FreshClientCard.tsx`** | **Google Sheets-first (WRONG)** | **3-10 seconds, often fails** |

`FreshClientCard.tsx` is used on the main Fresh Clients page and Handler Clients page -- the most frequently used views. Every status change there calls `await updateClientStatus(rowNumber, ...)` which hits Google Sheets directly and blocks the UI until it responds. If Sheets is slow or rate-limited, the change fails entirely.

## What Needs to Change

### File: `src/components/dashboard/FreshClientCard.tsx`

**1. `confirmStatusChange()` (normal status changes)**
- Currently: `await updateClientStatus(...)` -- blocks on Sheets
- Fix: Compute new status log locally with `generateStatusLogEntry()`, update local state instantly, write to Supabase cache via `updateClientFieldInCache()`, then fire Sheets sync in background with `.catch()`

**2. `handleSaveQuotation()` (QUOTATION SENT flow)**
- Currently: `await updateClientQuotation(...)` -- blocks on Sheets
- Fix: Update local state + Supabase cache instantly, then sync quotation and status to Sheets in background

**3. `handleSaveAdvancePendingQuotation()` (ADVANCE PENDING flow)**
- Currently: `await updateFinalQuotation(...)` then `await updateClientStatus(...)` -- two sequential blocking calls
- Fix: Update local state + Supabase cache for both finalQuotation and statusLog instantly, then sync both to Sheets in background

**4. `handleSaveBookedPayment()` (BOOKED flow)**
- Currently: `await addPayment(...)` then `await updateClientStatus(...)` -- two sequential blocking calls
- Fix: Compute payment update locally using `computePaymentUpdate()`, update local state + Supabase cache instantly, migrate to booked in cache, then sync to Sheets in background

### Imports to Add
- `generateStatusLogEntry`, `computePaymentUpdate` from `@/lib/timestamp-utils`
- `updateClientFieldInCache`, `migrateClientToBookedInCache` from `@/lib/clients-supabase-cache`

## Expected Result
- Status changes will feel **instant** (under 100ms) instead of waiting 3-10 seconds
- No more "Failed to update status" errors from Sheets timeouts or rate limits
- Sheets still gets updated in the background for data consistency
- Matches the proven pattern already working in ClientDetail and DesktopClientRow

