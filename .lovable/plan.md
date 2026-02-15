

# Verified Cache Tables for Booked Client Sub-Sheets

## Verification Summary

I cross-checked every column against the actual backend code in `google-sheets/index.ts` and the TypeScript interfaces in `client-contact-api.ts` and `useEventDetails.ts`. Everything matches perfectly.

## Table 1: `contact_details_cache`

Verified against `getClientContactDetails()` (line 1098) which reads range `A2:AB1000` (28 columns).

| Column | DB Column Name | Sheet Col | Array Index | Verified Source |
|--------|---------------|-----------|-------------|-----------------|
| PK | `registered_date_time_ad` | A | 0 | `foundRow[0]` line 1291 |
| | `row_number` | - | - | Row tracking (like clients_cache) |
| | `registered_date_bs` | B | 1 | `foundRow[1]` line 1292 |
| | `client_name` | C | 2 | `foundRow[2]` line 1293 |
| | `bride_full_name` | D | 3 | `foundRow[3]` line 1294 |
| | `bride_contact_number` | E | 4 | `foundRow[4]` line 1295 |
| | `bride_whatsapp_number` | F | 5 | `foundRow[5]` line 1296 |
| | `bride_backup_number` | G | 6 | `foundRow[6]` line 1297 |
| | `bride_backup_relation` | H | 7 | `foundRow[7]` line 1298 |
| | `bride_backup_number2` | I | 8 | `foundRow[8]` line 1299 |
| | `bride_backup_relation2` | J | 9 | `foundRow[9]` line 1300 |
| | `bride_instagram` | K | 10 | `foundRow[10]` line 1301 |
| | `bride_home_city` | L | 11 | `foundRow[11]` line 1302 |
| | `bride_home_area` | M | 12 | `foundRow[12]` line 1303 |
| | `bride_home_map` | N | 13 | `foundRow[13]` line 1304 |
| | `bride_home_landmark` | O | 14 | `foundRow[14]` line 1305 |
| | `groom_full_name` | P | 15 | `foundRow[15]` line 1306 |
| | `groom_contact_number` | Q | 16 | `foundRow[16]` line 1307 |
| | `groom_whatsapp_number` | R | 17 | `foundRow[17]` line 1308 |
| | `groom_backup_number` | S | 18 | `foundRow[18]` line 1309 |
| | `groom_backup_relation` | T | 19 | `foundRow[19]` line 1310 |
| | `groom_backup_number2` | U | 20 | `foundRow[20]` line 1311 |
| | `groom_backup_relation2` | V | 21 | `foundRow[21]` line 1312 |
| | `groom_instagram` | W | 22 | `foundRow[22]` line 1313 |
| | `groom_home_city` | X | 23 | `foundRow[23]` line 1314 |
| | `groom_home_area` | Y | 24 | `foundRow[24]` line 1315 |
| | `groom_home_map` | Z | 25 | `foundRow[25]` line 1316 |
| | `groom_home_landmark` | AA | 26 | `foundRow[26]` line 1317 |
| | `form_sent_date` | AB | 27 | `foundRow[27]` line 1318 |
| | `synced_to_sheet` | - | - | Sync tracking |
| | `updated_at` | - | - | Timestamp |

**Total: 28 data columns + 3 metadata = 31 columns**

## Table 2: `event_details_cache`

Verified against `getClientEventDetails()` (line 4517) which reads range `A2:AH500`. Events are stored as newline-separated values in the sheet, but each event becomes its own row in the cache.

| Column | DB Column Name | Sheet Col | Array Index | Verified Source |
|--------|---------------|-----------|-------------|-----------------|
| PK | `id` (uuid) | - | - | Auto-generated |
| UK | `registered_date_time_ad` | A | 0 | line 4546 |
| UK | `event_index` | - | - | Line index in multi-line cell |
| | `event_name` | D | 3 | `eventNames` line 4561 |
| | `event_year` | E | 4 | `eventYears` line 4562 |
| | `event_month` | F | 5 | `eventMonths` line 4563 |
| | `event_day` | G | 6 | `eventDays` line 4564 |
| | `event_date_ad` | H | 7 | `eventDatesAD` line 4565 |
| | `venue_type` | J | 9 | `venueTypes` line 4568 |
| | `venue_name` | K | 10 | `venueNames` line 4569 |
| | `venue_city` | L | 11 | `venueCities` line 4570 |
| | `venue_area` | M | 12 | `venueAreas` line 4571 |
| | `venue_map` | N | 13 | `venueMaps` line 4572 |
| | `event_start_time` | O | 14 | `eventStartTimes` line 4573 |
| | `event_end_time` | P | 15 | `eventEndTimes` line 4574 |
| | `parlour_type` | Q | 16 | `parlourTypes` line 4575 |
| | `parlour_name` | R | 17 | `parlourNames` line 4576 |
| | `parlour_city` | S | 18 | `parlourCities` line 4577 |
| | `parlour_area` | T | 19 | `parlourAreas` line 4578 |
| | `parlour_map` | U | 20 | `parlourMaps` line 4579 |
| | `parlour_start_time` | V | 21 | `parlourStartTimes` line 4580 |
| | `parlour_end_time` | W | 22 | `parlourEndTimes` line 4581 |
| | `do_groom_come_in_mehndi` | AE | 30 | `doGroomInMehndiArr` line 4583 |
| | `guest_count` | AF | 31 | `guestCounts` line 4584 |
| | `event_demands` | AG | 32 | `eventDemandsArr` line 4585 |
| | `event_references` | AH | 33 | `eventReferencesArr` line 4586 |
| | `synced_to_sheet` | - | - | Sync tracking |
| | `updated_at` | - | - | Timestamp |

**Unique constraint: (`registered_date_time_ad`, `event_index`)**
**Total: 22 data columns + 4 metadata = 26 columns**

Note: Columns X-AD (indices 23-29) are intentionally skipped -- the backend code confirms this at line 4582: `// Skip X-AD (indices 23-29 - preShoot fields not used)`

## Table 3: `freelancer_assignments` -- ALREADY EXISTS

The existing `freelancer_assignments` table already covers the "BOOKED CLIENTS FREELANCERS" sheet with all 10 role columns (PB, PG, VB, VG, EP, EV, Asst, iPhone, Drone, FPV) plus `required_categories`. No new table needed.

## Migration SQL

One migration will:
1. Create `contact_details_cache` with PK on `registered_date_time_ad`
2. Create `event_details_cache` with UUID PK and unique constraint on `(registered_date_time_ad, event_index)`
3. Enable RLS with "Allow all access" policy on both (matching existing pattern)
4. Add indexes on `registered_date_time_ad` for fast lookups
5. All text columns default to `''::text`, booleans default to `true`, timestamps default to `now()`

## What This Enables (Future Steps)
After tables are created:
1. Create sync edge functions for pull/push
2. Create TypeScript cache API files
3. Update hooks to read from cache first (instant loading)

