

## Confirmation: Both Sides Need the Same Fix

You're right to ask. Currently there's a mismatch:

- **Database (`clients_cache`)**: Has all 38 columns (A through AL), including `company_name`, `service_types`, `last_activity_log`, `priority`, `benzo_keep_notes`
- **`sync-clients-to-sheets` (pull/push)**: Already handles all 38 columns (A-AL) correctly
- **`copyToBookedClients` in `google-sheets/index.ts`**: Only reads/writes A-AG (33 columns) -- **this is the broken part**

So the database and the sync engine are already aligned. The only place that truncates data is `copyToBookedClients` (the MOVE operation when status changes to BOOKED).

### What needs to change

**File: `supabase/functions/google-sheets/index.ts`**

1. **Line 4193** -- Change read range from `A:AG` to `A:AL` (read all 38 columns)
2. **Lines 4247-4281** -- Add 5 missing columns to the `bookedValues` array:
   - `clientRow[33]` → AH: Company Name
   - `clientRow[34]` → AI: Service Types
   - `clientRow[35]` → AJ: Last Activity Log
   - `clientRow[36]` → AK: Priority
   - `clientRow[37]` → AL: Benzo Keep Notes
3. **Line 4284** -- Change write range from `A2:AG2` to `A2:AL2`

**File: `supabase/functions/sync-clients-to-sheets/index.ts`**

4. **Push action (~line 299)** -- Skip booked-migrating rows (`sheet_source === 'booked'` AND `row_number < 2`) to prevent duplicate rows in the BOOKED CLIENTS sheet
5. **Pull action (~line 227)** -- Add `benzo_keep_notes` protection (same pattern as existing payment protection) to prevent empty sheet values from overwriting DB notes

These 5 changes together ensure the Google Sheet MOVE copies all data, prevents duplicates, and protects notes during sync -- making both sides fully consistent.

