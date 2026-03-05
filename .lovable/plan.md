

## Audit Results: Remaining Faults in the System

I found **3 issues** that need fixing and **several areas that are safe**.

---

### ISSUE 1: Newly Appended Clients Never Get Marked as Synced (CRITICAL)

**Location:** `supabase/functions/sync-clients-to-sheets/index.ts`, line 243

When a new client is appended to Google Sheets (no existing row number), the code intentionally sets `synced_to_sheet: false` with the comment "kept unsynced for pull verification." But pull is now disabled, so these rows will **never** become `synced_to_sheet = true`. This means:

- Every push cycle will re-push these rows to Sheets infinitely
- The "pending syncs" counter will never reach 0 for new clients
- Wasted API calls on every push cycle

**Fix:** Change `synced_to_sheet: false` to `synced_to_sheet: true` on line 243, since pull verification no longer exists.

---

### ISSUE 2: `updateClientContactDetails` Reads Back from Sheets into Supabase

**Location:** `supabase/functions/google-sheets/index.ts`, lines 1451-1497

After updating contact details in Google Sheets, the function re-reads the updated row FROM the sheet and upserts it into `contact_details_cache`. This means Sheets data flows back into Supabase — violating the "Supabase is source of truth" rule.

If the sheet has stale or corrupted data, it would overwrite the database. The correct approach is to write the known data directly to `contact_details_cache` without re-reading from Sheets.

**Fix:** Instead of re-reading from Sheets after the write, upsert the known `updates` data directly into `contact_details_cache`.

---

### ISSUE 3: `pullStorageDevices` Action Still Active in google-sheets Function

**Location:** `supabase/functions/google-sheets/index.ts` (action `pullStorageDevices`, around line 7560-7634)

This action reads storage device data FROM the WTN STORAGE spreadsheet and inserts/updates it INTO the `storage_devices` Supabase table. While the frontend caller (`syncStorageDevicesFromSheets`) was disabled, the edge function action itself is still callable directly and could be triggered.

**Fix:** Make the `pullStorageDevices` action handler return a no-op response, same as what was done for the other pull actions.

---

### Safe Areas (No Issues Found)

| Area | Status |
|------|--------|
| `sync-clients-to-sheets` pull action | Disabled (no-op) |
| `sync-all-data` function | Disabled (no-op) |
| `sync-crew-to-sheets` pull action | Disabled (no-op) |
| `fullSyncContactDetails` | Sheet-to-Sheet only (BOOKED CLIENTS → CONTACT DETAILS sheet), no DB writes |
| `fullSyncEventDetails` | Sheet-to-Sheet only (BOOKED CLIENTS → EVENT DETAILS sheet), no DB writes |
| `fullSyncFreelancerAssignments` | Sheet-to-Sheet only, no DB writes |
| Push logic (DB → Sheets) | Working correctly |
| `deleteClient` | Correctly deletes from both Sheets AND Supabase |

---

### Summary of Changes

1. **`sync-clients-to-sheets/index.ts` line 243** — Change `synced_to_sheet: false` to `true` for appended rows
2. **`google-sheets/index.ts` lines 1451-1497** — Remove the re-read-from-sheets step; write known data directly to cache
3. **`google-sheets/index.ts` pullStorageDevices handler** — Replace with no-op return

