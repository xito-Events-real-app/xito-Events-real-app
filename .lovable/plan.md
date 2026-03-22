

## Fix: Add Missing Aashik Magar File Row for Shakti Neupane

### Problem
WEDDING BOTH SIDES crew has `extra_videographer = Aashik Magar`, but the `files_management` table has no row for him. All other crew members have file rows.

### Fix
Insert one skeleton file row for Aashik Magar / EV in WEDDING BOTH SIDES with the correct event metadata. No other data will be touched.

### Data to insert
- `registered_date_time_ad`: `2026-01-13T19:51:53.944Z`
- `registered_date_bs`: `2082-09-30`
- `client_name`: `Shakti Neupane`
- `event_name`: `WEDDING BOTH SIDES`
- `event_year`: `2082`, `event_month`: `11`, `event_day`: `28`, `event_date_ad`: `2026-03-12`
- `freelancer_type`: `EV`, `freelancer_name`: `Aashik Magar`
- `format_type`: `VIDEO`
- All other fields: defaults (0 size, empty paths)

### Safety
- Only 1 row inserted
- No existing data modified
- No code changes needed

