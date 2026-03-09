

## Fix: Include Video Edit Tracker in Client Deletion

### Problem
When deleting a client, the `deleteClientFromAll` function cleans up the main sheets and database tables but does NOT remove entries from:
1. The **BOOKED CLIENTS VIDEO EDIT TRACKER** sheet (Google Sheets)
2. The `client_deliverables` table (database)

So the deleted duplicate "NIBISHA MA'AM : PRARTHANA" still has rows in the video edit tracker.

### Changes

**File: `supabase/functions/google-sheets/index.ts`** — `deleteClientFromAll` function (lines ~6087-6133)

1. Add deletion from the Video Edit Tracker sheet — use the existing `deleteRowsByColumnA` helper, but match on **Column A** (registered_date_time_ad) in the `BOOKED CLIENTS VIDEO EDIT TRACKER` tab
2. Add `client_deliverables` to the Supabase tables cleanup list (currently missing)

```typescript
// Add after line 6110 (after BOOKED CLIENTS CONTACT DETAILS deletion):
await deleteRowsByColumnA(accessToken, spreadsheetId, 'BOOKED CLIENTS VIDEO EDIT TRACKER', registeredDateTimeAD);

// Update tables array at line 6113 to include client_deliverables:
const tables = ['clients_cache', 'event_details_cache', 'contact_details_cache', 
  'freelancer_assignments', 'freelancer_event_settings', 'client_deliverables'];
```

After deploying, we'll invoke the `deleteClient` action for the duplicate entry (`2026-01-18T16:19:50.358Z`) to clean up remaining video edit tracker rows.

