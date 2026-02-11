
# Fix Freelancer Assignments: Single-Row Storage + Bulk Sync + Sync Button

## Overview

Three changes:
1. **Rewrite backend to single-row storage** -- one row per client in "BOOKED CLIENTS FREELANCERS", with newline-separated freelancer values matching each event line (same philosophy as "BOOKED CLIENTS EVENT DETAILS")
2. **Add `fullSyncFreelancerAssignments` backend action** -- bulk-populates ALL booked clients into the freelancers sheet (same pattern as `fullSyncEventDetails`)
3. **Add "Sync Freelancers" button** to the Booked Dashboard header

---

## Sheet Philosophy (Single Row)

```text
Row for Client "John Doe":
Col A: 2026-01-18T19:25:45.624Z     (registeredDateTimeAD)
Col B: 2082-10-04                     (registeredDateBS)
Col C: John Doe                       (clientName)
Col D: Wedding\nReception             (events, newline-separated)
Col E: 2082\n2082                     (years)
Col F: 10\n10                         (months)
Col G: 15\n17                         (days)
Col H: 2026-01-28\n2026-01-30        (dates AD)
Col I: Ram Sharma\nShyam Thapa       (Photographer Bride per event)
Col J: Hari KC\n                      (Photographer Groom per event)
...Col R: \n                          (FPV Operator)
```

Each freelancer column (I-R) has the same number of newline entries as events in column D. The frontend splits these and presents them as individual event cards.

---

## Implementation Steps

### Step 1: Backend -- Rewrite 3 actions in Edge Function

**`getClientFreelancerAssignments`** (rewrite):
- Find the client's SINGLE row in "BOOKED CLIENTS FREELANCERS" by `registeredDateTimeAD`
- If no row exists, read from "BOOKED CLIENTS EVENT DETAILS" and create ONE row with Cols A-H copied, Cols I-R filled with matching empty newline entries
- Split the single row's newline-separated values into individual event objects for the frontend
- Also update Cols A-H from event details if they've changed (sync identity columns)

**`updateFreelancerAssignment`** (rewrite):
- Find the client's single row by `registeredDateTimeAD`
- Determine which event index the update targets (match by event name + date AD within the newline list)
- Read the current value in the target column, split by newline, replace value at that index, rejoin with newline
- Write the updated string back to the single cell

**`checkFreelancerAvailability`** (rewrite):
- Read all rows from "BOOKED CLIENTS FREELANCERS"
- For each row, split Col H (dates) by newline
- For each date matching the target, split freelancer columns at that same index
- If any column at that index matches the freelancer name with a different client, flag conflict

### Step 2: Backend -- New `fullSyncFreelancerAssignments` action

Follows the exact same pattern as `fullSyncEventDetails`:
1. Read all rows from "BOOKED CLIENTS EVENT DETAILS" (source of events)
2. Read all existing rows from "BOOKED CLIENTS FREELANCERS"
3. For each event details row NOT in freelancers sheet (by registeredDateTimeAD):
   - Create a new row with Cols A-H copied, Cols I-R empty (matching newline count)
4. For each existing row, update Cols A-H from event details (preserve I-R assignments)
5. Return counts: `{ copiedCount, updatedCount, totalFreelancers }`

### Step 3: Frontend API -- Add sync function

Add `fullSyncFreelancerAssignments()` to `src/lib/freelancer-assignment-api.ts`.

### Step 4: Booked Dashboard -- Add Sync Button

Add a "Sync Freelancers" button (with UserCog icon, teal color) to the header in `DesktopBookedAppLayout.tsx`, between "Sync Event Details" and "Full Resync". Same pattern as the existing sync buttons with loading state and toast feedback.

### Step 5: Dropdown Visibility Fix

Update `FreelancerAssignmentSection.tsx` PopoverContent and CommandItem styling to ensure solid backgrounds and readable text in the dark theme.

---

## Files to Modify

1. **`supabase/functions/google-sheets/index.ts`** -- Rewrite 3 freelancer actions for single-row storage + add `fullSyncFreelancerAssignments` action
2. **`src/lib/freelancer-assignment-api.ts`** -- Add `fullSyncFreelancerAssignments()` API function
3. **`src/components/booked/DesktopBookedAppLayout.tsx`** -- Add "Sync Freelancers" button with state/handler
4. **`src/components/client-detail/FreelancerAssignmentSection.tsx`** -- Fix dropdown visibility styling
