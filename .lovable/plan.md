

# Phase 1: Supabase Cache for Clients (Single Table, Two Sheets)

## Why Single Table is Safe for Two Sheets

The `sheet_source` column (`'tracker'` or `'booked'`) acts as an explicit router. When pushing changes back:
- `sheet_source = 'tracker'` writes to CLIENT TRACKER sheet
- `sheet_source = 'booked'` writes to BOOKED CLIENTS sheet

This is the same pattern your app already uses -- the `_source` field on `ClientData` already tracks which sheet a client belongs to. The single table just makes this persistent in the database.

When you add EVENT DETAILS, CONTACT DETAILS, etc. later, those get their **own separate tables** (`event_details_cache`, `contact_details_cache`) because they have completely different column structures. The single `clients_cache` table is only for the two client sheets that share the same A-AG schema.

## What Gets Built

### 1. Database Table: `clients_cache`

Maps directly to the ClientData interface (Columns A-AL from both sheets):

```text
Column A  -> registered_date_time_ad  (PRIMARY KEY)
Column B  -> registered_date_bs
Column C  -> client_name
Column D  -> source
Column E  -> client_location
Column F  -> current_country
Column G  -> contact_no
Column H  -> whatsapp_no
Column I  -> email
Column J  -> event_location
Column K  -> event_city
Column L  -> events
Column M  -> event_year
Column N  -> event_month
Column O  -> event_day
Column P  -> event_date_ad
Column Q  -> who_added
Column R  -> inquiry_date_ad
Column S  -> inquiry_date_bs
Column T  -> inquiry_time
Column U  -> description
Column V  -> quotation_data
Column W  -> status_log
Column X  -> client_handler
Column Y  -> call_log
Column Z  -> mindset
Column AA -> our_bargained_rates
Column AB -> client_bargained_rates
Column AC -> comments
Column AD -> final_quotation
Column AE -> payments_made
Column AF -> payment_dates_ad
Column AG -> remaining_payment
Column AH -> company_name
Column AI -> service_types
Column AJ -> last_activity_log
Column AK -> priority
Column AL -> benzo_keep_notes

Extra columns:
  sheet_source      -> 'tracker' or 'booked' (routing)
  row_number        -> integer (for sheet operations)
  synced_to_sheet   -> boolean (default true)
  updated_at        -> timestamp
```

RLS policy: Open access (matches existing `freelancer_assignments` pattern -- no auth in this app).

### 2. New Edge Function: `sync-clients-to-sheets`

Mirrors the proven `sync-crew-to-sheets` pattern with two actions:

**`pull` action:**
- Reads CLIENT TRACKER (A2:AL) and BOOKED CLIENTS (A2:AL) from Google Sheets
- Parses both into rows with `sheet_source = 'tracker'` or `'booked'`
- Deletes existing synced rows from `clients_cache`
- Upserts all rows with `synced_to_sheet = true`
- Returns count of cached rows

**`push` action:**
- Reads rows where `synced_to_sheet = false`
- For each row, uses `sheet_source` to determine target sheet
- Writes changed data back to the correct Google Sheet
- Marks rows as `synced_to_sheet = true`
- Returns count of synced rows

### 3. New File: `src/lib/clients-supabase-cache.ts`

Cache layer functions (mirroring `freelancer-assignment-cache.ts`):

- `loadClientsFromCache()` -- SELECT all from `clients_cache`
- `loadTrackerClientsFromCache()` -- SELECT WHERE `sheet_source = 'tracker'`
- `loadBookedClientsFromCache()` -- SELECT WHERE `sheet_source = 'booked'`
- `isCachePopulated()` -- quick count check
- `updateClientFieldInCache(registeredDateTimeAD, field, value)` -- instant update, sets `synced_to_sheet = false`
- `populateCacheFromSheets()` -- calls edge function `pull`
- `pushUnsyncedToSheets()` -- calls edge function `push`
- `getUnsyncedCount()` -- count pending syncs

### 4. Modified: `src/hooks/useCachedData.ts`

Current slow flow:
```text
Mount -> IndexedDB -> if expired -> Edge Function -> Google Sheets API (~3-5s)
```

New fast flow:
```text
Mount -> Supabase clients_cache (~50ms) -> if empty -> pull from Sheets (one-time)
```

Changes:
- Replace `getCachedData()` (IndexedDB) with `loadClientsFromCache()` (Supabase)
- On first use: if cache is empty, trigger `pull` to populate
- Keep dropdowns in IndexedDB (small, static data -- no change needed)
- Background push for unsynced rows every 30 seconds

### 5. Modified: `src/hooks/useBookedCachedData.ts`

Same optimization -- reads from `clients_cache` filtered by `sheet_source = 'booked'` instead of calling Google Sheets API directly.

### 6. Modified: `supabase/config.toml`

Add the new edge function config:
```toml
[functions.sync-clients-to-sheets]
verify_jwt = false
```

## Files Summary

| Action | File |
|--------|------|
| Create | DB migration for `clients_cache` table |
| Create | `supabase/functions/sync-clients-to-sheets/index.ts` |
| Create | `src/lib/clients-supabase-cache.ts` |
| Modify | `src/hooks/useCachedData.ts` |
| Modify | `src/hooks/useBookedCachedData.ts` |
| Modify | `supabase/config.toml` |

## What Stays the Same

- Google Sheets remains the main source of truth
- The `google-sheets` edge function is untouched (status changes, payments, comments still write directly to sheets)
- Dropdowns stay in IndexedDB
- `freelancer_assignments` table and `sync-crew-to-sheets` function are untouched
- All existing write operations (status change, payment, comment) continue to work -- they write to sheets first, then the next `pull` updates the cache

## Performance Impact

- Dashboard/Search/Calendar load: from ~3-5 seconds to ~50ms
- First-ever load: one `pull` operation (~5s), then instant forever
- Google Sheets API calls reduced by ~80% (reads come from cache)

