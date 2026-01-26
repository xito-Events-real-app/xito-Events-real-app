
# Plan: Sync BOOKED CLIENTS to BOOKED CLIENTS EVENT DETAILS Sheet

## Overview

Create a new synchronization system that copies specific columns from the "BOOKED CLIENTS" sheet to a new "BOOKED CLIENTS EVENT DETAILS" sheet with a different column structure. This enables tracking detailed event logistics (venue, parlour, pre-shoot details) separately from client information.

---

## Column Mapping

### Source: BOOKED CLIENTS → Target: BOOKED CLIENTS EVENT DETAILS

| BOOKED CLIENTS | → | EVENT DETAILS | Purpose |
|----------------|---|---------------|---------|
| A (registeredDateTimeAD) | → | A | Unique ID (for sync matching) |
| B (registeredDateBS) | → | B | Registration Date BS |
| C (clientName) | → | C | Client Name |
| L (events) | → | D | Event Names |
| M (eventYear) | → | E | Event Year |
| N (eventMonth) | → | F | Event Month |
| O (eventDay) | → | G | Event Day |
| P (eventDateAD) | → | H | Event Date AD |

### New Columns in EVENT DETAILS (J-AH) - User Input Only
| Column | Field |
|--------|-------|
| J | Venue Type |
| K | Venue Name |
| L | Venue City |
| M | Venue Area |
| N | Venue Map |
| O | Event Start Time |
| P | Event End Time |
| Q | Parlour Type |
| R | Parlour Name |
| S | Parlour City |
| T | Parlour Area |
| U | Parlour Map |
| V | Parlour Start Time |
| W | Parlour End Time |
| X | Pre-Shoot Venue Type |
| Y | Pre-Shoot Venue Name |
| Z | Pre-Shoot Venue City |
| AA | Pre-Shoot Venue Area |
| AB | Pre-Shoot Venue Map |
| AC | Pre-Shoot Start Time |
| AD | Pre-Shoot End Time |
| AE | Do Groom Come In Mehndi? |
| AF | No. of Guest |
| AG | Event Demand |
| AH | Event References |

---

## Technical Implementation

### 1. Edge Function Changes (supabase/functions/google-sheets/index.ts)

**Add new action types to SheetRequest interface (line 21):**
```typescript
| 'getBookedEventDetails' 
| 'syncToEventDetails' 
| 'fullSyncEventDetails'
| 'updateEventDetails'
```

**Add helper function: `copyToEventDetails`**
- Copies a single client from BOOKED CLIENTS to EVENT DETAILS
- Maps columns A-C directly, L-P to D-H
- Leaves J-AH empty for user input

**Add action handler: `syncToEventDetails`**
- Triggered when a new client is added to BOOKED CLIENTS (after status changes to BOOKED)
- Checks if client already exists in EVENT DETAILS using registeredDateTimeAD
- Only copies if not already present

**Add action handler: `fullSyncEventDetails`**
- Scans all BOOKED CLIENTS entries
- Copies missing entries to EVENT DETAILS
- Optionally updates columns A-C and D-H for existing entries (preserving J-AH user input)

**Add action handler: `getBookedEventDetails`**
- Fetches all data from BOOKED CLIENTS EVENT DETAILS sheet
- Returns full column structure (A-AH)

**Add action handler: `updateEventDetails`**
- Updates specific columns (J-AH) for a client in EVENT DETAILS
- Identified by registeredDateTimeAD

### 2. Frontend API (src/lib/sheets-api.ts)

**Add new interface:**
```typescript
export interface BookedEventDetails {
  rowNumber: number;
  registeredDateTimeAD: string;  // A - Unique ID
  registeredDateBS: string;       // B
  clientName: string;             // C
  events: string;                 // D (from L)
  eventYear: string;              // E (from M)
  eventMonth: string;             // F (from N)
  eventDay: string;               // G (from O)
  eventDateAD: string;            // H (from P)
  // Column I is empty/reserved
  venueType: string;              // J
  venueName: string;              // K
  venueCity: string;              // L
  venueArea: string;              // M
  venueMap: string;               // N
  eventStartTime: string;         // O
  eventEndTime: string;           // P
  parlourType: string;            // Q
  parlourName: string;            // R
  parlourCity: string;            // S
  parlourArea: string;            // T
  parlourMap: string;             // U
  parlourStartTime: string;       // V
  parlourEndTime: string;         // W
  preShootVenueType: string;      // X
  preShootVenueName: string;      // Y
  preShootVenueCity: string;      // Z
  preShootVenueArea: string;      // AA
  preShootVenueMap: string;       // AB
  preShootStartTime: string;      // AC
  preShootEndTime: string;        // AD
  doGroomComeInMehndi: string;    // AE
  noOfGuest: string;              // AF
  eventDemand: string;            // AG
  eventReferences: string;        // AH
}
```

**Add new functions:**
```typescript
export async function getBookedEventDetails(limit?: number): Promise<BookedEventDetails[]>

export async function syncToEventDetails(registeredDateTimeAD: string): Promise<{ success: boolean }>

export async function fullSyncEventDetails(): Promise<{ 
  success: boolean; 
  copiedCount: number; 
  updatedCount: number; 
  totalEvents: number 
}>

export async function updateEventDetails(
  rowNumber: number,
  updates: Partial<BookedEventDetails>
): Promise<{ success: boolean }>
```

### 3. Automatic Sync Integration

**Modify `updateClientStatus` in edge function:**
- When status changes to "BOOKED", after copying to BOOKED CLIENTS, also trigger copy to EVENT DETAILS

**Modify `copyToBookedClients` function:**
- After successfully copying to BOOKED CLIENTS, call `copyToEventDetails`

---

## Sync Behavior

```text
CLIENT TRACKER                BOOKED CLIENTS              BOOKED CLIENTS EVENT DETAILS
     |                              |                              |
     | (status → BOOKED)            |                              |
     +----------------------------->|                              |
     |       (auto-copy A-AG)       |                              |
     |                              +----------------------------->|
     |                              |       (auto-copy A-C, L-P)   |
     |                              |                              |
     | (hourly resync / manual)     |                              |
     +----------------------------->|----------------------------->|
                                    |   (sync only A-C, D-H)       |
                                    |   (preserve J-AH user data)  |
```

### Key Sync Rules:
1. **New BOOKED client**: Automatically copied to both sheets
2. **Full resync**: Updates A-C and D-H in EVENT DETAILS, preserves J-AH
3. **Event detail changes**: Only affects EVENT DETAILS sheet (J-AH columns)
4. **Unique ID**: registeredDateTimeAD (Column A) used for matching

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/google-sheets/index.ts` | Add `copyToEventDetails`, `getBookedEventDetails`, `syncToEventDetails`, `fullSyncEventDetails`, `updateEventDetails` functions and action handlers |
| `src/lib/sheets-api.ts` | Add `BookedEventDetails` interface and API functions |

---

## Implementation Order

1. **Phase 1: Edge Function - Read Operations**
   - Add `getBookedEventDetails` function
   - Add action handler in main switch

2. **Phase 2: Edge Function - Write Operations**
   - Add `copyToEventDetails` helper
   - Add `syncToEventDetails` action
   - Add `fullSyncEventDetails` action
   - Add `updateEventDetails` action

3. **Phase 3: Auto-Sync Integration**
   - Modify `copyToBookedClients` to also copy to EVENT DETAILS
   - Add sync to hourly auto-sync (optional)

4. **Phase 4: Frontend API**
   - Add `BookedEventDetails` interface
   - Add API wrapper functions

---

## Technical Notes

- The EVENT DETAILS sheet must be manually created in Google Sheets with the header row
- Column I is intentionally left empty as a separator between basic info (A-H) and event details (J-AH)
- J-AH columns are ONLY written by `updateEventDetails` and preserved during sync operations
- The sync uses registeredDateTimeAD as the unique identifier (same as BOOKED CLIENTS)
