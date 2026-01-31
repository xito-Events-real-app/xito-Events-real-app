
# Plan: Fix Quotation Data Not Saving to Sheets

## Problem Analysis

When adding quotation amounts from the client page (e.g., for "Sargat Thapa"), the data is NOT saved to Google Sheets. The quotation was added 3 times but nothing persisted.

### Root Cause

The `updateClientQuotation` function is missing the critical `registeredDateTimeAD` parameter needed for row verification:

**Current frontend API call (`sheets-api.ts` line 247-254):**
```typescript
export async function updateClientQuotation(
  rowNumber: number,
  quotationData: string
): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("updateClientQuotation", {
    data: { rowNumber, quotationData },  // MISSING registeredDateTimeAD!
  });
}
```

**Backend expects `registeredDateTimeAD` (edge function line 1926-1932):**
```typescript
async function updateClientQuotation(accessToken, spreadsheetId, rowNumber, quotationData, registeredDateTimeAD) {
  // ...
  const actualRowNumber = await verifyRowNumber(..., registeredDateTimeAD);
  // Without registeredDateTimeAD, verifyRowNumber just returns the original rowNumber
  // If rows have shifted, the update goes to the WRONG row (corrupting data)
}
```

**What happens:**
1. User opens client detail page with cached `rowNumber` from earlier
2. New clients are added to the sheet, rows shift down
3. User saves quotation with the outdated `rowNumber`
4. Backend writes to the wrong row (or an empty row if the ID is wrong)
5. No error is thrown - the API returns success but data is in the wrong place

### The Same Issue Exists in Multiple Locations

| File | Line | Call |
|------|------|------|
| `src/pages/ClientDetail.tsx` | ~719 | `updateClientQuotation(client.rowNumber, quotationData)` |
| `src/components/dashboard/FreshClientCard.tsx` | ~1140 | `updateClientQuotation(client.rowNumber, quotationData)` |
| `src/components/desktop/DesktopClientRow.tsx` | ~506 | `updateClientQuotation(client.rowNumber, quotationData)` |

---

## Solution

### Step 1: Update the Frontend API Function

Modify `sheets-api.ts` to accept and pass `registeredDateTimeAD`:

```typescript
export async function updateClientQuotation(
  rowNumber: number,
  quotationData: string,
  registeredDateTimeAD?: string  // Add this parameter
): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("updateClientQuotation", {
    data: { rowNumber, quotationData, registeredDateTimeAD },  // Pass it to backend
  });
}
```

### Step 2: Update All Call Sites to Pass `registeredDateTimeAD`

**File: `src/pages/ClientDetail.tsx` (handleSaveQuotation)**
```typescript
// Before:
await updateClientQuotation(client.rowNumber, quotationData);

// After:
await updateClientQuotation(client.rowNumber, quotationData, client.registeredDateTimeAD);
```

**File: `src/components/dashboard/FreshClientCard.tsx`**
```typescript
// Before:
await updateClientQuotation(client.rowNumber, quotationData);

// After:
await updateClientQuotation(client.rowNumber, quotationData, client.registeredDateTimeAD);
```

**File: `src/components/desktop/DesktopClientRow.tsx`**
```typescript
// Before:
await updateClientQuotation(client.rowNumber, quotationData);

// After:
await updateClientQuotation(client.rowNumber, quotationData, client.registeredDateTimeAD);
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/sheets-api.ts` | Add `registeredDateTimeAD` parameter to `updateClientQuotation` function |
| `src/pages/ClientDetail.tsx` | Pass `client.registeredDateTimeAD` to `updateClientQuotation` call |
| `src/components/dashboard/FreshClientCard.tsx` | Pass `client.registeredDateTimeAD` to `updateClientQuotation` call |
| `src/components/desktop/DesktopClientRow.tsx` | Pass `client.registeredDateTimeAD` to `updateClientQuotation` call |

---

## Why This Fix Works

The `verifyRowNumber` function in the edge function (line 1117-1155):
1. Takes the `registeredDateTimeAD` (unique timestamp ID from Column A)
2. Searches Column A (A2:A2000) in the sheet for the exact match
3. Returns the **correct current row number** even if rows have shifted
4. If `registeredDateTimeAD` is missing, it falls back to the provided `rowNumber` (which may be outdated)

By passing `registeredDateTimeAD`, we ensure the quotation is written to the correct row even if the sheet structure has changed since the page was loaded.

---

## Technical Note: Edge Function Already Handles This

The backend (`supabase/functions/google-sheets/index.ts` lines 4702-4710) already accepts `registeredDateTimeAD`:
```typescript
case 'updateClientQuotation':
  if (!data || !data.rowNumber) throw new Error('...');
  result = await updateClientQuotation(
    accessToken, 
    spreadsheetId, 
    data.rowNumber as number, 
    data.quotationData as string || '',
    data.registeredDateTimeAD as string | undefined  // Already handled!
  );
```

No backend changes are needed - the issue is purely that the frontend wasn't sending this parameter.

---

## Expected Behavior After Fix

1. User opens client detail for "Sargat Thapa"
2. Adds quotation amounts (e.g., BASIC: 50,000, STANDARD: 60,000)
3. Clicks "Save & Update Status"
4. Frontend sends: `{ rowNumber: X, quotationData: "...", registeredDateTimeAD: "2026-01-31T02:42:39.340Z" }`
5. Backend verifies correct row using the unique ID
6. Data is written to Column V of the correct row
7. Success - data persists correctly in sheets
