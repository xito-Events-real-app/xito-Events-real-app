

## Remove Duplicate "NIBISHA MA'AM : PRARTHANA" Client

### What's happening
Two entries exist for the same client:
1. `2025-03-05 17:18:25` — Has final quotation (PREMIUM: NPR 55,000/-), status BOOKED. **Keep this one.**
2. `2026-01-18T16:19:50.358Z` — No quotation, no final quotation. **Delete this one.**

### Plan

1. **Delete from `clients_cache`** — Remove the row where `registered_date_time_ad = '2026-01-18T16:19:50.358Z'`
2. **Delete from related tables** — Clean up any associated rows in `event_details_cache`, `contact_details_cache`, `freelancer_assignments`, `client_deliverables`, and `freelancer_event_settings` for the same `registered_date_time_ad`
3. **Delete from Google Sheet** — Call the existing `deleteClient` API to remove it from the Booked Clients sheet as well

### Files Changed
- `supabase/functions/google-sheets/index.ts` — No code changes needed; will use existing `deleteClient` action
- Direct database cleanup via migration for the cache tables

