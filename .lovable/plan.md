

# Supabase Cache Layer for All Clients Crew Assignments

## Problem
Every freelancer assignment change on the All Clients page calls Google Sheets directly, which is slow (1-3 seconds per cell update). This makes the UI feel sluggish when assigning multiple freelancers.

## Solution
Add a Supabase table as a fast read/write layer. The All Clients page will read from and write to Supabase instantly, while a background sync process pushes changes to Google Sheets.

```text
Current Flow:
  UI click --> Google Sheets API (slow) --> UI update

New Flow:
  UI click --> Supabase table (instant) --> UI update
                    |
              Background sync --> Google Sheets API
```

## Architecture

### 1. New Supabase Table: `freelancer_assignments`

| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| registered_date_time_ad | text | Client unique ID |
| registered_date_bs | text | BS date |
| client_name | text | Client name |
| event | text | Event name |
| event_year | text | BS year |
| event_month | text | BS month |
| event_day | text | BS day |
| event_date_ad | text | AD date |
| photographer_bride | text | |
| photographer_groom | text | |
| videographer_bride | text | |
| videographer_groom | text | |
| extra_photographer | text | |
| extra_videographer | text | |
| assistant | text | |
| iphone_shooter | text | |
| drone_operator | text | |
| fpv_operator | text | |
| required_categories | text | Comma-separated codes |
| synced_to_sheet | boolean | false = pending sync |
| updated_at | timestamptz | Last modification time |

Unique constraint on `(registered_date_time_ad, event)`.

### 2. Data Flow

**Loading (on page open):**
1. Read from Supabase table first (instant)
2. If table is empty or stale, trigger a "pull from Sheets" to populate it
3. The existing "Sync Clients" button continues to do the full 4-sheet chain AND refreshes the Supabase table afterward

**Assigning a freelancer (click):**
1. Write to Supabase table instantly (UPDATE the row, set `synced_to_sheet = false`)
2. UI updates immediately from Supabase response
3. A debounced background function pushes all `synced_to_sheet = false` rows to Google Sheets

**Background Sheet Sync:**
- A new edge function `sync-crew-to-sheets` picks up all rows where `synced_to_sheet = false`
- Groups them by `registered_date_time_ad` and batch-updates the FREELANCERS sheet
- Marks rows as `synced_to_sheet = true` after success
- Triggered automatically after a short delay (e.g., 3 seconds of inactivity) or manually via button

### 3. Files to Create/Modify

**New files:**
- **Migration SQL** -- Create `freelancer_assignments` table with RLS policies (public read/write since there's no user auth gating this app currently)
- **`supabase/functions/sync-crew-to-sheets/index.ts`** -- Edge function that reads unsynced rows from Supabase and batch-writes them to Google Sheets
- **`src/lib/freelancer-assignment-cache.ts`** -- New API layer that reads/writes to Supabase instead of calling the edge function for every cell update

**Modified files:**
- **`src/components/suite/AllClientsCrewTable.tsx`** -- Switch `handleAssign` to use the new Supabase-backed API; add a "Push to Sheets" indicator/button; load data from Supabase first
- **`src/lib/freelancer-assignment-api.ts`** -- Add a `populateSupabaseFromSheets()` function that pulls all FREELANCERS sheet data and upserts into Supabase
- **`supabase/functions/google-sheets/index.ts`** -- Add a new action `pullFreelancerAssignmentsToSupabase` that reads FREELANCERS sheet and writes to the Supabase table (for initial population and after full syncs)

### 4. User Experience

- **First load**: Data loads from Supabase (if populated) in under 200ms instead of 2-3 seconds
- **Assigning**: Click a cell, select freelancer -- updates instantly (no spinner)
- **Sync indicator**: A small badge shows "X unsaved" when there are unsynced changes, with an auto-sync that fires after 3 seconds of inactivity
- **Manual sync**: The existing "Sync Clients" button still does the full chain + refreshes Supabase
- **Refresh**: The "Refresh" button pulls fresh data from Sheets into Supabase

### 5. Sync Safety

- The Supabase table is the fast cache; Google Sheets remains the source of truth
- On "Sync Clients" or "Refresh", Sheets data overwrites Supabase (but only for synced rows -- pending local changes are preserved)
- Required categories updates also go through the same fast path
- The `updated_at` timestamp prevents stale overwrites during concurrent edits

## Technical Details

### Migration SQL
```sql
CREATE TABLE public.freelancer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registered_date_time_ad text NOT NULL,
  registered_date_bs text DEFAULT '',
  client_name text DEFAULT '',
  event text NOT NULL,
  event_year text DEFAULT '',
  event_month text DEFAULT '',
  event_day text DEFAULT '',
  event_date_ad text DEFAULT '',
  photographer_bride text DEFAULT '',
  photographer_groom text DEFAULT '',
  videographer_bride text DEFAULT '',
  videographer_groom text DEFAULT '',
  extra_photographer text DEFAULT '',
  extra_videographer text DEFAULT '',
  assistant text DEFAULT '',
  iphone_shooter text DEFAULT '',
  drone_operator text DEFAULT '',
  fpv_operator text DEFAULT '',
  required_categories text DEFAULT '',
  synced_to_sheet boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(registered_date_time_ad, event)
);

ALTER TABLE public.freelancer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to freelancer_assignments"
  ON public.freelancer_assignments FOR ALL
  USING (true) WITH CHECK (true);
```

### Edge Function: `sync-crew-to-sheets`
- Reads all rows where `synced_to_sheet = false`
- For each row, calls the existing `updateFreelancerAssignment` logic to write to Google Sheets
- Marks rows as synced after success
- Returns count of synced rows

### Frontend Cache API (`freelancer-assignment-cache.ts`)
- `loadFromSupabase(year, month)` -- fast query filtered by event_year/month
- `updateAssignmentLocal(id, event, field, value)` -- instant Supabase UPDATE
- `pushUnsyncedToSheets()` -- calls the sync edge function
- `pullFromSheets()` -- triggers full sheet read and upsert to Supabase

