

# Bug Analysis: ASHISH POUDYAL showing ADVANCE PENDING

## Root Cause: Duplicate Entry (Not a Logic Bug)

This client was entered **twice** with different name spellings:

| Entry | Name | Source | Status | Date Added |
|---|---|---|---|---|
| Old (stale) | ASHISH **POUDYAL** | tracker | ADVANCE PENDING | Apr 11 |
| Current (correct) | ASHISH **PAUDYAL** | booked | BOOKED ✅ | Apr 14 |

Both have the same phone number (9860675002), confirming they are the same person. The system treats them as separate clients because they have different `registered_date_time_ad` values and different name spellings.

## Fix

**Delete the stale tracker row** for "ASHISH POUDYAL" (registered_date_time_ad: `2026-04-11T06:00:16.103Z`) from `clients_cache`.

This is a one-time data cleanup — no code changes needed.

## Optional: Prevent Future Duplicates

To avoid this happening again, we could add a **duplicate detection warning** when adding a new client: if the phone number already exists in the database, show a warning before saving. This would catch re-entries with slightly different name spellings.

