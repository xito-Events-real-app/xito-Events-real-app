

# Fix: Ensure New Booked Clients Get Full Data Pipeline Treatment

## Root Cause Analysis

When FUNNY BHUSAN was added via direct database INSERT, the normal app flow was bypassed. The app's "Add Client" flow (QuickAdd.tsx) does 3 things after inserting into `clients_cache`:

1. Creates **freelancer assignment skeleton rows** in `freelancer_assignments` (one per event)
2. Triggers a **push to Google Sheets** via the sync engine
3. Updates the **in-memory cache** so all views refresh instantly

The direct SQL insert did step 0 (database row) but skipped steps 1-3. That's why:
- **Freelancers section says "No event details found"** -- there are 0 rows in `freelancer_assignments` for this client
- **Client is not in Google Sheets** -- `synced_to_sheet` is `false` and no push was triggered
- **All Clients view may not show him** -- the in-memory singleton cache wasn't updated

## Fix Plan (2 steps)

### Step 1: Insert freelancer assignment skeleton rows

Insert 3 rows into `freelancer_assignments` (one per event) with the client's metadata:

| event | event_date_ad | event_year | event_month | event_day |
|-------|--------------|------------|-------------|-----------|
| WEDDING(BOTH SIDES) | 2026-04-29 | 2083 | 1 | 16 |
| PRE+RECEPTION | 2026-04-30 | 2083 | 1 | 17 |
| PRE+RECEPTION | 2026-05-02 | 2083 | 1 | 19 |

Each row will include `registered_date_time_ad`, `client_name`, `registered_date_bs`, and `synced_to_sheet: false`.

### Step 2: Trigger a push sync to Google Sheets

Call the `sync-clients-to-sheets` edge function with `action: 'push'` to push the unsynced client row to Google Sheets. This will assign a real `row_number` and mark `synced_to_sheet: true`.

After that, also call `sync-crew-to-sheets` with `action: 'push'` to push the freelancer assignment rows.

### Why This Fixes Everything

- **Freelancer section**: Will find 3 assignment rows and render the assignment cards instead of "No event details found"
- **Google Sheets**: Client will be written to the BOOKED CLIENTS sheet with a proper row number
- **All Clients / Booked Clients views**: Already have the database row; the realtime subscription or next page load will pick it up

### No Code Changes Needed

This is a data-only fix. The existing code paths (QuickAdd, ClientDetail) already handle this correctly when clients are added through the app. The loophole was the manual SQL insert bypassing the app's data pipeline.

