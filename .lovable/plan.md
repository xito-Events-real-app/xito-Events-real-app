

# Fix: Move Elena Acharya Back to Client Tracker

## What Happened

During the Beyond_true fix on 02/24/2026 at 00:12:14, the backend accidentally wrote a "BOOKED" status entry to **row 2** (Elena Acharya) of the BOOKED CLIENTS sheet. This caused the system to treat her as a booked client.

## Data Correction Steps

1. **Remove the erroneous "BOOKED" entry** from Elena's status log in Google Sheets, restoring it to:
   - `CALLED : QUOTATION PENDING [2026-02-12 22:45:07]`
   - `QUOTATION SENT : REVIEW PENDING - 02/12/2026, 22:49:35`

2. **Move Elena back to CLIENT TRACKER** -- Copy her row from BOOKED CLIENTS back to CLIENT TRACKER and delete it from BOOKED CLIENTS.

3. **Re-sync the Supabase cache** so the app reflects the corrected data.

## Technical Details

This will be done by:
- Using the `google-sheets` edge function's `updateBookedClient` action to fix her status log (remove the fake BOOKED entry)
- Then manually moving her row data back to CLIENT TRACKER using the edge function
- Finally triggering a `sync-clients-to-sheets` pull to refresh the cache

No application code changes are needed -- this is purely a data correction.
