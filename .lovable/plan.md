

# Add Missing Booked Client: FUNNY BHUSAN

## What happened
The client "FUNNY BHUSAN" is missing from the `clients_cache` table with `sheet_source = 'booked'`. This needs a direct database insert.

## Action
Insert one row into the `clients_cache` table with the following data:

| Field | Value |
|-------|-------|
| registered_date_time_ad | 2026-01-26T06:13:50.728Z |
| registered_date_bs | 2082-10-12 |
| client_name | FUNNY BHUSAN |
| source | INSTAGRAM |
| client_location | INSIDE NEPAL |
| current_country | Nepal |
| contact_no | 9860833177 |
| whatsapp_no | 9860833177 |
| event_location | INSIDE VALLEY |
| event_city | Kathmandu |
| events | WEDDING(BOTH SIDES)\nPRE+RECEPTION\nPRE+RECEPTION |
| event_year | 2083\n2083\n2083 |
| event_month | 1\n1\n1 |
| event_day | 16\n17\n19 |
| event_date_ad | 2026-04-29\n2026-04-30\n2026-05-02 |
| who_added | BENZO |
| inquiry_date_ad | 2025-12-30 |
| inquiry_date_bs | 2082-09-15 |
| inquiry_time | 4:29 |
| status_log | BOOKED [2026-01-26 11:58:50] |
| client_handler | BENZO |
| final_quotation | PREMIUM: NPR 225,000/- |
| payments_made | NPR 51,000/- AS ADVANCE ON FRI 2082-10-09 IN MASTER BENZO |
| payment_dates_ad | 2026-01-23 |
| remaining_payment | NPR 1,74,000/- |
| company_name | WEDDING TALES NEPAL |
| service_types | PHOTOGRAPHY |
| sheet_source | booked |
| row_number | 0 |
| synced_to_sheet | false |

## Technical Details
- Single SQL INSERT into the `clients_cache` table
- `sheet_source` set to `booked` so the client appears in the Booked Clients module
- `synced_to_sheet` set to `false` so the next push sync will write it to Google Sheets
- `row_number` set to `0` since the actual sheet row will be assigned during sync

