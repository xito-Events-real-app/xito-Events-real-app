

# Emergency Fix: Restore Funny Bhusan + Fix BOOKED Migration Data Destruction Bug

## What Happened

When Namuna Thapa was migrated from tracker to BOOKED, the system kept her **tracker row_number** (e.g., row 15 in CLIENT TRACKER). The push scheduler then wrote her data to `'BOOKED CLIENTS'!A15` -- overwriting Funny Bhusan who occupied that row in the BOOKED CLIENTS sheet. The next pull sync then read the sheet (which now had Namuna's data where Funny Bhusan used to be), and Funny Bhusan was completely erased from both the sheet and the database.

## Fix Summary

### 1. Restore Funny Bhusan's Data (Database Insert)

Insert Funny Bhusan's complete record back into `clients_cache` using the sheet data you provided. All fields will be restored.

### 2. Fix `migrateClientToBookedInCache` (src/lib/clients-supabase-cache.ts)

Two critical changes:
- Set `row_number: 0` -- invalidates the tracker row so the push can never overwrite the wrong row in BOOKED CLIENTS
- Set `synced_to_sheet: true` -- prevents the generic push scheduler from touching this record; the proper sheet MOVE will be handled by `updateClientStatus` instead

### 3. Add Background `updateClientStatus` Call (3 files)

The `updateClientStatus` edge function already handles the correct MOVE operation (copy to BOOKED CLIENTS at next empty row, delete from CLIENT TRACKER, trigger downstream syncs to EVENT DETAILS/FREELANCERS/CONTACT DETAILS). Add a background call to it in all three `handleSaveBookedPayment` implementations:

- `src/components/desktop/DesktopClientRow.tsx`
- `src/pages/ClientDetail.tsx`
- `src/components/dashboard/FreshClientCard.tsx`

### 4. Fix Push Logic for Safety (supabase/functions/sync-clients-to-sheets/index.ts)

Change the push action so that when a booked client has `row_number < 2`, instead of skipping and marking synced (data loss), it **appends** to the next empty row in BOOKED CLIENTS and updates the DB record with the correct row number. This acts as a safety net.

## Technical Changes

### Database: Insert Funny Bhusan
```sql
INSERT INTO clients_cache (
  registered_date_time_ad, registered_date_bs, client_name, source,
  client_location, current_country, contact_no, whatsapp_no,
  event_location, event_city, events, event_year, event_month, event_day,
  event_date_ad, who_added, inquiry_date_ad, inquiry_date_bs, inquiry_time,
  status_log, client_handler, final_quotation, payments_made,
  payment_dates_ad, remaining_payment, company_name, service_types,
  sheet_source, row_number, synced_to_sheet
) VALUES (...);
```

### clients-supabase-cache.ts
```typescript
// migrateClientToBookedInCache changes:
.update({
  sheet_source: 'booked',
  row_number: 0,              // NEW: invalidate tracker row
  synced_to_sheet: true,       // NEW: let updateClientStatus handle sheet
  status_log: newStatusLog,
  // ... rest unchanged
})
```

### All 3 handleSaveBookedPayment functions
```typescript
// Add after migrateClientToBookedInCache call:
import { updateClientStatus } from "@/lib/sheets-api";

// Background: proper sheet MOVE (tracker -> booked + downstream syncs)
updateClientStatus(
  client.rowNumber, pendingStatus, newStatusLog,
  undefined, client.registeredDateTimeAD
).catch(err => console.warn('[BACKGROUND] Sheet MOVE failed:', err));
```

### sync-clients-to-sheets edge function (push action)
```text
Current: row_number < 2 --> skip, mark synced (DATA LOSS)
Fixed:   row_number < 2 AND sheet_source = 'booked' --> APPEND to next empty row
         --> update DB row_number --> mark synced
```

## Files Changed

| File | Change |
|------|--------|
| Database | Insert Funny Bhusan record |
| `src/lib/clients-supabase-cache.ts` | Set `row_number: 0`, `synced_to_sheet: true` |
| `src/components/desktop/DesktopClientRow.tsx` | Add `updateClientStatus` background call |
| `src/pages/ClientDetail.tsx` | Same |
| `src/components/dashboard/FreshClientCard.tsx` | Same |
| `supabase/functions/sync-clients-to-sheets/index.ts` | Append logic for booked clients with invalid row |

