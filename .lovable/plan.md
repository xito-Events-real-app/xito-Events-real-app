
# Plan: Fix Final Quotation (Column AD) Saving to Both Sheets

## Problem Summary

The Final Quotation is NOT saving because:

1. **Frontend API Missing ID**: `updateFinalQuotation()` in `sheets-api.ts` does NOT send `registeredDateTimeAD` to the backend
2. **Backend Hardcoded to Wrong Sheet**: The backend `updateFinalQuotation()` is hardcoded to ONLY write to `'CLIENT TRACKER'!AD` - it never writes to `BOOKED CLIENTS` even when the client is already booked

## Your Flow (as I understand it)

| Column | Purpose | When Set |
|--------|---------|----------|
| **V** | Initial Quotation Tiers (BASIC, STANDARD, PREMIUM amounts) | When client is in CLIENT TRACKER, status = QUOTATION SENT |
| **AD** | Final Fixed Quotation (locked package + amount) | When transitioning to ADVANCE PENDING or for any BOOKED client |

The "Add Final Quotation" action should save to **Column AD** in **whichever sheet the client currently lives** (CLIENT TRACKER or BOOKED CLIENTS).

---

## Solution

### 1. Frontend: Pass `registeredDateTimeAD` to `updateFinalQuotation`

**File: `src/lib/sheets-api.ts`**

```typescript
// BEFORE:
export async function updateFinalQuotation(
  rowNumber: number,
  finalQuotation: string
): Promise<{ success: boolean; finalQuotation: string }> {
  return callSheetsFunction<{ success: boolean; finalQuotation: string }>("updateFinalQuotation", {
    data: { rowNumber, finalQuotation },
  });
}

// AFTER:
export async function updateFinalQuotation(
  rowNumber: number,
  finalQuotation: string,
  registeredDateTimeAD?: string  // ADD THIS
): Promise<{ success: boolean; finalQuotation: string }> {
  return callSheetsFunction<{ success: boolean; finalQuotation: string }>("updateFinalQuotation", {
    data: { rowNumber, finalQuotation, registeredDateTimeAD },  // PASS IT
  });
}
```

---

### 2. Update All Call Sites to Pass the ID

**File: `src/pages/ClientDetail.tsx` (handleSaveAdvancePendingQuotation ~line 756)**

```typescript
// BEFORE:
const quotationResult = await updateFinalQuotation(client.rowNumber, finalData);

// AFTER:
const quotationResult = await updateFinalQuotation(
  client.rowNumber, 
  finalData, 
  client.registeredDateTimeAD  // ADD THIS
);
```

Also update any other call sites in:
- `src/components/dashboard/FreshClientCard.tsx`
- `src/components/desktop/DesktopClientRow.tsx`

---

### 3. Backend: Smart Sheet Routing for `updateFinalQuotation`

**File: `supabase/functions/google-sheets/index.ts`**

The current code (line 2306-2308):
```typescript
// CURRENT (BROKEN):
const actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, registeredDateTimeAD);
const range = encodeURIComponent(`'CLIENT TRACKER'!AD${actualRowNumber}`);
```

Updated to search BOTH sheets and write to the correct one:
```typescript
// NEW (FIXED):
async function updateFinalQuotation(
  accessToken: string, 
  spreadsheetId: string, 
  rowNumber: number, 
  finalQuotation: string,
  registeredDateTimeAD?: string
) {
  if (!rowNumber || rowNumber < 2) {
    throw new Error('Valid rowNumber is required for updating final quotation');
  }

  let targetSheet = 'CLIENT TRACKER';
  let actualRowNumber = rowNumber;

  if (registeredDateTimeAD) {
    // Try to find in CLIENT TRACKER first
    const trackerRow = await findRowByRegisteredDateTime(accessToken, spreadsheetId, 'CLIENT TRACKER', registeredDateTimeAD);
    
    if (trackerRow) {
      targetSheet = 'CLIENT TRACKER';
      actualRowNumber = trackerRow;
    } else {
      // If not in Tracker, try BOOKED CLIENTS
      const bookedRow = await findRowByRegisteredDateTime(accessToken, spreadsheetId, 'BOOKED CLIENTS', registeredDateTimeAD);
      
      if (bookedRow) {
        targetSheet = 'BOOKED CLIENTS';
        actualRowNumber = bookedRow;
      }
    }
  } else {
    // Fallback: verify row in Tracker if no ID provided
    actualRowNumber = await verifyRowNumber(accessToken, spreadsheetId, 'CLIENT TRACKER', rowNumber, undefined);
  }

  // Write to Column AD in the correct sheet
  const range = encodeURIComponent(`'${targetSheet}'!AD${actualRowNumber}`);
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values: [[finalQuotation]] }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Google Sheets API error (updateFinalQuotation):', response.status, errorText);
    throw new Error(`Failed to update final quotation: ${response.status}`);
  }

  return { success: true, finalQuotation, actualRowNumber, targetSheet };
}
```

---

### 4. Add Helper Function: `findRowByRegisteredDateTime`

Add a reusable helper to find a row in a specific sheet by the unique ID:

```typescript
async function findRowByRegisteredDateTime(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  registeredDateTimeAD: string
): Promise<number | null> {
  const range = encodeURIComponent(`'${sheetName}'!A2:A2000`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!response.ok) return null;
  
  const data = await response.json();
  const values = data.values || [];
  
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === registeredDateTimeAD) {
      return i + 2; // +2 because data starts at row 2
    }
  }
  
  return null;
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/sheets-api.ts` | Add `registeredDateTimeAD` parameter to `updateFinalQuotation` |
| `src/pages/ClientDetail.tsx` | Pass `client.registeredDateTimeAD` in `handleSaveAdvancePendingQuotation` |
| `src/components/dashboard/FreshClientCard.tsx` | Pass `registeredDateTimeAD` if calling `updateFinalQuotation` |
| `src/components/desktop/DesktopClientRow.tsx` | Pass `registeredDateTimeAD` if calling `updateFinalQuotation` |
| `supabase/functions/google-sheets/index.ts` | 1. Add `findRowByRegisteredDateTime` helper<br>2. Update `updateFinalQuotation` to search both sheets and write to the correct one |

---

## Expected Result After Fix

1. User opens **Sargat Thapa** (BOOKED client in BOOKED CLIENTS sheet)
2. Clicks "Add Final Quotation" (via ADVANCE PENDING flow or a new action)
3. Selects package (e.g., STANDARD) and enters amount (e.g., 85,000)
4. Clicks Save
5. **Frontend** sends: `{ rowNumber: X, finalQuotation: "STANDARD: NPR 85,000/-", registeredDateTimeAD: "2026-01-31T02:42:39.340Z" }`
6. **Backend** searches for the ID:
   - Not found in CLIENT TRACKER
   - Found in BOOKED CLIENTS at row Y
7. **Backend** writes to `'BOOKED CLIENTS'!AD{Y}`
8. Data is correctly saved to Column AD in BOOKED CLIENTS sheet

---

## Bonus: UI Clarity

For BOOKED clients who don't have a Final Quotation (Column AD), the UI currently shows "Add Quotation" which is confusing. After this fix, we could optionally update `QuotationDisplaySection.tsx` to show:

- **"Lock Final Quotation"** instead of "Add Quotation"
- Make it clear that this saves to Column AD (Final Fixed), not Column V (Initial Tiers)

This UX improvement can be done in a follow-up if needed.
