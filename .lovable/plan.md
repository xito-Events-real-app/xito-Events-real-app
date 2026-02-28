

# Fix: Benzo Keep "Create Client" Not Saving to Database + Backfill 2 Missing Clients

## The Problem

When you create a new client through Benzo Keep's "Create + Assign" button, the code only calls `addClient()` which sends data to Google Sheets. It **never inserts into the database**. Since the app reads only from the database, the client is invisible.

The QuickAdd page does this correctly — it inserts into the database first, then syncs to Sheets in the background. Benzo Keep skips the database step entirely.

## Two Things to Do

### 1. Fix the Code (Prevent Future Failures)

In `src/components/suite/BenzoKeepNotepadDialog.tsx`, inside `handleSaveWithClient` (lines 208-244), add a database insert **before** the Sheets call. This mirrors exactly what QuickAdd does:

- Insert into `clients_cache` via `.upsert()` with all available client fields
- Set `sheet_source: 'tracker'` and `synced_to_sheet: false`
- Update memory cache and dispatch `cache-updated` event
- Then call `addClient()` in the background for Sheets sync (already exists)
- Then assign the Benzo Keep note (already exists)

### 2. Backfill the 2 Missing Clients (One-Time Database Fix)

Since **Shreeish Bahadur Shrestha** and **Sushant Singh (Kafle)** already exist in the Google Sheet but not in the database, we need to manually insert them. We'll pull their data from the sheet via the existing sync edge function to populate their records in `clients_cache`.

This will be done by triggering a targeted pull sync that will pick up these missing rows from the CLIENT TRACKER sheet and insert them into the database.

## Files to Change

**`src/components/suite/BenzoKeepNotepadDialog.tsx`** — Add database insert before Sheets call in `handleSaveWithClient` (lines 208-226):

```typescript
// BEFORE calling addClient (Sheets sync), insert into database first
const { error: insertError } = await supabase.from('clients_cache').upsert({
  registered_date_time_ad: registeredDateTimeAD,
  client_name: quickClientData.clientName.trim(),
  contact_no: quickClientData.contactNo.trim(),
  whatsapp_no: quickClientData.whatsappNo.trim(),
  source: quickClientData.source,
  client_handler: quickClientData.clientHandler,
  status_log: quickClientData.initialStatus
    ? `${now.toLocaleString()} - ${quickClientData.initialStatus}`
    : '',
  events: quickClientData.events,
  event_year: quickClientData.eventYear,
  event_month: quickClientData.eventMonth,
  event_day: quickClientData.eventDay,
  sheet_source: 'tracker',
  synced_to_sheet: false,
}, { onConflict: 'registered_date_time_ad' });

if (insertError) {
  console.error('Database insert failed:', insertError);
  throw insertError;
}

// Update memory cache + notify UI
import { getMemoryClients, setMemoryClients } from "@/lib/memory-cache";
import { notifyCacheUpdate } from "@/lib/cache-manager";

const memClients = getMemoryClients();
if (memClients) {
  setMemoryClients([newClient, ...memClients]);
}
notifyCacheUpdate('clients');

// THEN sync to Sheets in background (existing code)
addClient(newClient).catch(err => console.warn('Sheet sync failed:', err));
```

Also add the `benzo_keep_notes` field to the database insert so the note is saved atomically with the client record, rather than requiring a separate `assignBenzoKeepNoteToClient` call.

**Database**: Run a one-time pull sync to backfill Shreeish Bahadur Shrestha and Sushant Singh (Kafle) from the CLIENT TRACKER sheet into `clients_cache`.

