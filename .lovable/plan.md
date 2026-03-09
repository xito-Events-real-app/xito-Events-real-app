

## Root Cause

The 3 clients — **GEETA & WILLIAM**, **PRAMILA BHUSAL**, **PUSHPA POUDEL & SIWAN KHARAL** — are completely **missing from `clients_cache`** (the main table). Their rows were deleted during a recent database migration. However, all their related data is fully preserved in:
- `freelancer_assignments` (crew assignments with event dates)
- `event_details_cache` (venue, timing, event details)
- `contact_details_cache` (bride/groom contact info)
- `files_management` (file records)

Since they appear in "All Clients" (which reads from `freelancer_assignments`), but clicking them fails because the Client Detail page looks up the client in `clients_cache` — and finds nothing.

## Fix: Re-insert into `clients_cache`

Using the data from `freelancer_assignments` and `event_details_cache`, reconstruct each client's `clients_cache` row with status set to **BOOKED**. The data to insert:

**1. PUSHPA POUDEL & SIWAN KHARAL** (`2026-01-26T08:38:58.826Z`)
- Events: BRIDES MEHNDI, WEDDING(BOTH SIDES)
- Dates: 2082-11-6, 2082-11-8 (AD: 2026-02-18, 2026-02-20)
- Status: BOOKED, sheet_source: booked

**2. PRAMILA BHUSAL** (`2026-01-25T13:16:03.057Z`)
- Events: BRIDE MEHNDI, WEDDING BRIDE
- Dates: 2082-11-10, 2082-11-12 (AD: 2026-02-22, 2026-02-24)
- Status: BOOKED, sheet_source: booked

**3. GEETA & WILLIAM** (`2026-02-06T13:30:27.148Z`)
- Events: POST-SHOOT
- Dates: 2082-11-4 (AD: 2026-02-16)
- Status: BOOKED, sheet_source: booked

## Steps

1. **Insert 3 rows into `clients_cache`** using the database insert tool with all reconstructed fields (client_name, events, event dates, registered_date_bs, status_log as BOOKED, sheet_source as 'booked', synced_to_sheet as false).

2. **No code changes needed** — the Client Detail page already handles lookup by `registeredDateTimeAD`, so once the rows exist again, navigation will work.

3. After insertion, a simple refresh in the app will restore all 3 clients with full functionality including their crew assignments, event details, contact info, and files.

