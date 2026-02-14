

# Fix: Columns Placed Wrongly in BOOKED CLIENTS FREELANCERS Sheet

## Root Cause

The `copyToEventDetails` function uses Google Sheets `insertDimension` to insert a new row at position 2, which **shifts all existing rows down by one**. When the downstream `syncSingleClientToFreelancers` runs immediately after, it reads EVENT DETAILS data from shifted positions. This causes the FREELANCERS row data to land in wrong columns because the source data (EVENT DETAILS) has been corrupted by the row shift.

The `fullSyncEventDetails` function already uses the safer `:append` API, but the single-client `copyToEventDetails` was never updated to match.

## Fix

### File: `supabase/functions/google-sheets/index.ts`

**Replace `copyToEventDetails` row insertion logic (lines 4126-4150 and 4168)**

Change from the dangerous `insertDimension` (insert at row 2) pattern to the safe `:append` pattern that `fullSyncEventDetails` already uses.

Before (dangerous):
```typescript
// Insert a new row at position 2
const sheetId = await getSheetId(...);
await fetch(insertUrl, { body: { insertDimension: { startIndex: 1, endIndex: 2 } } });
// Write to A2:I2
const writeRange = "'BOOKED CLIENTS EVENT DETAILS'!A2:I2";
```

After (safe):
```typescript
// Append at bottom - no row shifting
const appendUrl = `.../'BOOKED CLIENTS EVENT DETAILS'!A:I:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
await fetchWithRetry(appendUrl, { method: 'POST', body: { values: [eventDetailsValues] } });
```

This eliminates:
- Row shifting that corrupts existing EVENT DETAILS data positions
- The `getSheetId` call (no longer needed)
- The separate insert + write two-step (replaced by single append)

It also uses `fetchWithRetry` instead of raw `fetch` to handle 429 rate limits.

## Column Layout Confirmation (No Changes Needed)

The FREELANCERS sheet column mapping is correct and stays as-is:
- **A-H**: Metadata (Registered DateTime, Date BS, Client Name, Event, Year, Month, Day, Date AD)
- **I-R**: 10 freelancer role columns (PB, PG, VB, VG, EP, EV, Asst, iPhone, Drone, FPV)
- **S-Z**: Reserved/unused
- **AA**: Required Freelancers (categories)

## Files to Modify

1. `supabase/functions/google-sheets/index.ts` -- replace `copyToEventDetails` row-insert logic with append (lines 4126-4178)

