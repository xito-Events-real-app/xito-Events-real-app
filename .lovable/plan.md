

## Restore 3 Missing Booked Clients + Cleanup

### Good News First
The previously restored clients (Pramila Bhusal, Pushpa Poudel, Geeta & William) are already **fully correct** — proper `\n` separators in `clients_cache` and correctly split `event_details_cache` rows. No fixes needed there.

### What Needs to Be Done

**Insert 3 missing clients into `clients_cache`** (all have intact crew/event/contact data in other tables):

| Client | Events (chronological order) | BS Dates |
|---|---|---|
| ARADHANA (AARUU.ME) | KASAR, BRATABANDA, FAMILY GATHERING | Falgun 14, 15, 16 (2082) |
| NIBISHA MA'AM : PRARTHANA | CHRISTIAN WEDDING | Magh 6 (2082) |
| FUNNY BHUSAN | WEDDING(BOTH SIDES), PRE+RECEPTION, PRE+RECEPTION | Baisakh 16, 17, 19 (2083) |

All using `\n` separators, `status_log = 'BOOKED'`, `sheet_source = 'booked'`, `synced_to_sheet = false`.

**Delete orphaned `event_details_cache` rows** for `2026-02-21T17:49:36.769Z` (3 stale rows with no matching client).

### Technical Steps

1. **Database data insert** — 3 INSERT statements into `clients_cache` with `ON CONFLICT DO NOTHING` safety
2. **Database delete** — Remove orphaned `event_details_cache` rows
3. **No code changes** — all pages already work once the data exists
4. **Verify** — Confirm all 3 clients load their detail pages with correct event splits

