

## Fix: Non-BOOKED Clients Should Not Appear in Booked Views

### Problem
When MANDIRA NEUPANE's status was changed from BOOKED to POSTPONED, she still appears in All Clients (crew table), File Management, and the Booked Dashboard because:
1. Her `sheet_source` remains `'booked'` in `clients_cache`
2. `loadBookedClientsFromCache()` loads ALL `sheet_source='booked'` rows without checking current status
3. Her `freelancer_assignments` and `files_management` rows still exist

### Solution: Filter by Active BOOKED Status

Rather than moving data between sheets (which you explicitly want to avoid), we filter at the **query level** so only clients with an active BOOKED status appear in booked views.

#### 1. Filter `loadBookedClientsFromCache()` by status
**File: `src/lib/clients-supabase-cache.ts`**

After loading all `sheet_source='booked'` rows, filter out clients whose `getCurrentStatus()` is NOT "BOOKED" (excluding BOOKED SOMEWHERE ELSE). This ensures POSTPONED / CANCELLED clients don't appear in:
- Booked Dashboard
- All Clients crew table
- Booking Calendar
- Hot Dates

#### 2. Filter `_ensureFileRowsForMonthInner()` to skip non-BOOKED clients
**File: `src/lib/files-api.ts`**

When generating file skeleton rows, cross-check the client's current status. If the client is no longer BOOKED, skip creating file rows for them. Also soft-delete existing skeleton rows for non-BOOKED clients during cleanup.

#### 3. Filter `freelancer_assignments` display in AllClientsCrewTable
**File: `src/components/suite/AllClientsCrewTable.tsx`**

When loading assignments for display, cross-check against `clients_cache` status. Exclude assignments where the client is no longer actively BOOKED.

#### 4. Handle the realtime subscription filter
**File: `src/hooks/useBookedCachedData.ts`**

In the realtime handler, when a client UPDATE comes in, check if their status is still BOOKED. If not, remove them from the local state instead of updating.

### Safety
- No data is deleted — `sheet_source` stays as `'booked'` in the database
- If status is changed back to BOOKED, the client reappears automatically
- File rows with backup data are never touched

### Files Changed
- `src/lib/clients-supabase-cache.ts` — Add status filter to `loadBookedClientsFromCache()`
- `src/lib/files-api.ts` — Skip non-BOOKED clients in file row generation
- `src/components/suite/AllClientsCrewTable.tsx` — Filter out non-BOOKED assignments
- `src/hooks/useBookedCachedData.ts` — Handle status-changed clients in realtime

