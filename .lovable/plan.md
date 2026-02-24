

# Fix: Crew Schedule Page + Database Sync Integrity

## Three Issues Found

### Issue 1: Parentheses in freelancer names break the crew schedule query
The `or()` filter sends `AJAY ADHIKARI (SAFAL)` into PostgREST where parentheses are syntax delimiters, causing zero results.

### Issue 2: Event details on public crew page require authentication
The crew schedule calls `google-sheets` edge functions (which need auth) to load event/contact details. The crew schedule is a public page -- no login. The data already exists in `event_details_cache` and `contact_details_cache` tables with open access.

### Issue 3: Google Sheets "pull" overwrites correct database data
The user's rule: **All Clients is the heart of the system -- changes made there should be the database.** Currently, when `handleSync` or `handleRefresh` runs, it calls `populateCacheFromSheets()` which pulls from Google Sheets and **overwrites** the database. If the Google Sheets push failed or was delayed, the pull brings back stale data, destroying the correct local assignments.

The NIMTO PURAUNE wrong data (AJAY as PG, SUDARSHAN as VG) is likely stale Google Sheets data that overwrote the correct database values during a sync/pull.

## The Fixes

### Fix 1: Client-side filtering for parentheses (CrewSchedule.tsx)

Remove the `or()` filter entirely. Fetch all assignments from the table and filter in JavaScript using the existing `normalize()` function.

```text
// Before (broken for parentheses):
const orFilter = ROLE_COLUMNS.map(col => `${col}.ilike.%${decodedName}%`).join(",");
supabase.from("freelancer_assignments").select("...").or(orFilter)

// After (works for any name):
supabase.from("freelancer_assignments").select("...")
// Then filter in JavaScript using normalize()
```

### Fix 2: Read details from cache tables (CrewSchedule.tsx)

Replace the `google-sheets` edge function calls with direct reads from `event_details_cache` and `contact_details_cache` tables.

```text
// Before (requires auth):
supabase.functions.invoke("google-sheets", { body: { action: "getClientEventDetails" } })

// After (no auth needed, faster):
supabase.from("event_details_cache").select("*").eq("registered_date_time_ad", regKey)
supabase.from("contact_details_cache").select("*").eq("registered_date_time_ad", regKey)
```

### Fix 3: Protect local database from stale Sheets overwrite (sync-crew-to-sheets)

During `pull`, preserve rows that have `synced_to_sheet = false` (pending local changes). Currently the pull deletes all `synced_to_sheet = true` rows then upserts from Sheets. But the upsert can overwrite a row that was locally changed and already pushed (marked `synced_to_sheet = true` after push). 

The fix: during pull, **skip upsert for any row that already exists in the database with a more recent `updated_at` timestamp**. This ensures that local changes made from All Clients always win over stale Google Sheets data.

### Fix 4: Correct the wrong NIMTO PURAUNE data

After deploying the fixes, the user needs to:
1. Open All Clients page
2. Go to Abinash & Subekshya's NIMTO PURAUNE event
3. Clear the wrong PG (AJAY) and VG (SUDARSHAN) assignments
4. The auto-push will sync the corrections to both database and Google Sheets

Alternatively, we can fix the database directly as part of this change.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/CrewSchedule.tsx` | Remove `or()` filter, use client-side filtering; read details from cache tables instead of edge functions |
| `supabase/functions/sync-crew-to-sheets/index.ts` | During `pull`, skip overwriting rows that have a newer `updated_at` than the pull timestamp, preserving local changes |

## What This Ensures

- All Clients page changes are the source of truth -- the database reflects what All Clients shows
- Google Sheets pulls never overwrite more recent local changes
- Freelancers with parentheses in names see their events on the crew schedule
- Event details load on public crew schedule pages without login
