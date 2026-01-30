

# Plan: Remove BOOKED Clients from CLIENT TRACKER (Single Source of Truth)

## Overview

This plan restructures the data flow so that **clients with BOOKED status are ONLY stored in the BOOKED CLIENTS sheet**, removing them from the CLIENT TRACKER. This creates a true single source of truth architecture.

---

## Current Architecture (Before)

```text
┌──────────────────────────────────┐      ┌──────────────────────────────────┐
│        CLIENT TRACKER            │      │        BOOKED CLIENTS            │
│  (All clients including BOOKED)  │◄────►│   (Copy of BOOKED clients)       │
└──────────────────────────────────┘      └──────────────────────────────────┘
              │                                        │
              ▼                                        ▼
       Hot Dates, Calendar,                    Finance Module,
       Search, Filters, etc.                   Payment History
              │                                        │
              └──────────────┬─────────────────────────┘
                             ▼
                    Same client appears in
                    BOTH sheets (duplicated)
```

**Problems:**
- Same client exists in TWO places
- Two-way sync causes confusion
- Data can drift between sheets
- Resync operations are complex

---

## New Architecture (After)

```text
┌──────────────────────────────────┐      ┌──────────────────────────────────┐
│        CLIENT TRACKER            │      │        BOOKED CLIENTS            │
│  (Non-booked clients ONLY)       │      │   (BOOKED clients ONLY)          │
│  - Just Enquired                 │      │   - Status: BOOKED               │
│  - Quotation Sent                │      │   - Payment Data                 │
│  - Bargaining                    │      │   - Event Details                │
│  - Advance Pending               │      │                                  │
│  - Cancelled / Gone Elsewhere    │      │                                  │
└──────────────────────────────────┘      └──────────────────────────────────┘
              │                                        │
              ▼                                        ▼
     Active Sales Pipeline                    Confirmed Bookings
              │                                        │
              └──────────────┬─────────────────────────┘
                             ▼
                     COMBINED DATA
           Hot Dates, Calendar, Search, etc.
           (Fetches from BOTH sheets)
```

---

## Critical Risk Assessment

### HIGH RISK AREAS

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing features break | Hot Dates, Calendar, Booking stats | Modify to query BOTH sheets |
| Search functionality | Won't find BOOKED clients | Update search to query BOTH sheets |
| Client Detail navigation | Links may break | Update navigation to handle both sources |
| Status transitions | BOOKED → other status breaks | Move client back to Tracker on status change |
| Reverse transitions | Non-BOOKED → BOOKED | Move client from Tracker to Booked sheet |
| Cache architecture | Two separate caches | Unified cache or merged queries |

### WHAT STAYS THE SAME
- Hot Dates will show same data (from combined sources)
- Calendar/Booking Open Dates display unchanged
- Client Detail pages work identically
- Finance Manager unchanged (already uses BOOKED CLIENTS)
- Event Details unchanged (linked to BOOKED CLIENTS)

---

## Changes Required

### 1. Backend: Modify `getClients` to Exclude BOOKED
**File**: `supabase/functions/google-sheets/index.ts`

Currently returns ALL clients from CLIENT TRACKER. 

**New behavior**: Filter out clients whose latest status is "BOOKED"

### 2. Backend: Create `getAllClientsFromBothSheets` Function
**File**: `supabase/functions/google-sheets/index.ts`

New function that:
- Fetches from CLIENT TRACKER (non-BOOKED)
- Fetches from BOOKED CLIENTS
- Merges and returns unified client list
- Used by Hot Dates, Calendar, Search features

### 3. Backend: Modify `updateClientStatus` for BOOKED Transitions
**File**: `supabase/functions/google-sheets/index.ts`

When status changes TO "BOOKED":
1. Copy client row to BOOKED CLIENTS sheet
2. DELETE the row from CLIENT TRACKER
3. Update Event Details sheet

When status changes FROM "BOOKED" to something else:
1. Copy client row back to CLIENT TRACKER
2. DELETE from BOOKED CLIENTS (but preserve payment history?)

### 4. Backend: Modify `searchClients` to Query Both Sheets
**File**: `supabase/functions/google-sheets/index.ts`

Current: Searches only CLIENT TRACKER

**New behavior**: Search BOTH sheets, merge results

### 5. Backend: Remove/Simplify Full Resync
**File**: `supabase/functions/google-sheets/index.ts`

The `fullResyncAllBookedClients` function becomes simpler:
- No longer needs to copy between sheets
- Only validates data integrity

### 6. Frontend: Update `useCachedData` Hook
**File**: `src/hooks/useCachedData.ts`

Options:
- **Option A**: Merge booked clients into unified cache
- **Option B**: Create separate fetch for "all clients" endpoint

### 7. Frontend: Update Hot Dates Page
**File**: `src/pages/HotDates.tsx`

Currently uses `useCachedData()` which reads CLIENT TRACKER.

**Update**: Use new unified data source or merge both caches.

### 8. Frontend: Update Desktop Dashboard
**File**: `src/components/desktop/DesktopDashboard.tsx`

Calendar data, Hot Dates, Cold Dates all need unified data source.

---

## Migration Strategy

### Phase 1: Preparation (Backend)
1. Create `getAllClients` endpoint that merges both sheets
2. Ensure all read operations can source from both sheets
3. Add DELETE row capability for CLIENT TRACKER

### Phase 2: Status Transition Logic
1. Modify status change to MOVE (not copy) clients
2. Test BOOKED → other status reverse transitions
3. Handle edge cases (payment data preservation)

### Phase 3: Frontend Updates
1. Update cache hooks to use unified endpoint
2. Verify Hot Dates, Calendar, Search all work
3. Test navigation between modules

### Phase 4: Cleanup
1. Simplify/remove two-way sync functions
2. Update resync to only handle edge cases
3. Remove redundant BOOKED clients from TRACKER

---

## Technical Details

### Row Deletion (New Operation)
```typescript
async function deleteTrackerRow(
  accessToken: string,
  spreadsheetId: string,
  rowNumber: number
) {
  const sheetId = await getSheetId(accessToken, spreadsheetId, 'CLIENT TRACKER');
  
  const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  await fetch(deleteUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1, // 0-indexed
            endIndex: rowNumber,
          },
        },
      }],
    }),
  });
}
```

### Merged Client Query
```typescript
async function getAllClients(accessToken: string, spreadsheetId: string, limit = 500) {
  const [trackerClients, bookedClients] = await Promise.all([
    getClients(accessToken, spreadsheetId, limit), // Non-BOOKED only
    getBookedClients(accessToken, spreadsheetId, limit),
  ]);
  
  // Merge with source indicator
  const merged = [
    ...trackerClients.map(c => ({ ...c, _source: 'tracker' })),
    ...bookedClients.map(c => ({ ...c, _source: 'booked', rowNumber: c.bookedRowNumber })),
  ];
  
  return merged;
}
```

---

## Concerns & Open Questions

### 1. Payment History When Un-Booking
If a client goes from BOOKED → CANCELLED BY CLIENT:
- Should payment data move with them?
- Should it stay in BOOKED CLIENTS for financial records?

**Recommendation**: Keep a reference/archive but move client back to Tracker.

### 2. Existing Duplicate Data
Currently, BOOKED clients exist in BOTH sheets.
- Migration needed to clean up Tracker
- One-time script to delete BOOKED rows from Tracker

### 3. Row Number Stability
Deleting rows shifts all subsequent row numbers.
- All operations must use `registeredDateTimeAD` as primary key
- Row numbers become temporary references only

### 4. Offline/Cache Sync
With clients split across sheets:
- Cache invalidation becomes more complex
- May need unified cache key strategy

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/google-sheets/index.ts` | Major: Add `getAllClients`, modify `updateClientStatus`, add `deleteTrackerRow`, modify `searchClients` |
| `src/lib/sheets-api.ts` | Add new API wrapper functions |
| `src/hooks/useCachedData.ts` | Fetch from unified endpoint or merge |
| `src/hooks/useBookedCachedData.ts` | May become primary source for booked |
| `src/pages/HotDates.tsx` | Use unified data source |
| `src/components/desktop/DesktopDashboard.tsx` | Use unified data source |
| `src/pages/Search.tsx` | Update search to query both |
| Multiple components | Update any direct `getClients` calls |

---

## Estimated Effort

- **Backend changes**: Complex (row deletion, merged queries, status transitions)
- **Frontend changes**: Moderate (cache merging, data source updates)
- **Testing**: Extensive (all features use client data)
- **Risk level**: HIGH - this touches nearly every feature

---

## Alternative Approach (Safer)

Instead of deleting from Tracker, consider:
1. Keep Tracker as "archive/history"
2. Mark BOOKED clients as "archived" in Tracker (new column)
3. Exclude archived from normal queries
4. Benefits: No row deletion, reversible, simpler

This preserves data while achieving "single source" for active use.

