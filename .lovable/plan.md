

# Fix: Auto-Sync freelancer_assignments with clients_cache

## Problem Summary

| Client | Events in clients_cache | Rows in freelancer_assignments | Issue |
|--------|------------------------|-------------------------------|-------|
| SHREEISH BAHADUR SHRESTHA | 3 | 0 | Completely missing |
| LAJJA UPRETY | 5 | 4 | Missing BRIDE'S MEHNDI (Baisakh 5) |
| FUNNY BHUSAN | 0 | 3 | Orphan rows (no client record) |

**Root cause**: No code auto-inserts skeleton rows into `freelancer_assignments` when a client is booked or events are edited. The system relied on manual Google Sheets syncs that are now removed.

## Solution (4 Parts)

### Part 1: Shared helper function

**File: `src/lib/freelancer-assignment-cache.ts`**

Add a new exported function `ensureFreelancerAssignmentRows()` that:
1. Parses newline-separated event fields from the client record
2. Reads existing `freelancer_assignments` rows for the client
3. Inserts skeleton rows (all crew fields empty, `synced_to_sheet: false`) for missing events using `upsert` with `onConflict: 'registered_date_time_ad,event,event_date_ad'`
4. Deletes rows for events that no longer exist in the client record

Parameters: `registeredDateTimeAD`, `clientName`, `registeredDateBS`, `events`, `eventYears`, `eventMonths`, `eventDays`, `eventDatesAD` (all newline-separated strings matching `clients_cache` format).

### Part 2: Hook into QuickAdd edit mode

**File: `src/pages/QuickAdd.tsx`**

After the existing `event_details_cache` sync block (around line 407), add a matching call to `ensureFreelancerAssignmentRows()` using the same parsed event data. This ensures that when events are added/removed via the edit form, the crew table stays in sync.

### Part 3: Hook into QuickAdd add mode (for BOOKED clients)

**File: `src/pages/QuickAdd.tsx`**

After the Supabase insert (around line 525), if the client's initial status contains "BOOKED", call `ensureFreelancerAssignmentRows()` to pre-populate the crew table immediately.

### Part 4: Hook into BOOKED migration flows

When a client status changes to BOOKED, call `ensureFreelancerAssignmentRows()` right after `migrateClientToBookedInCache()` in these 3 files:
- **`src/pages/ClientDetail.tsx`** (around line 713)
- **`src/components/dashboard/FreshClientCard.tsx`** (around line 1287)
- **`src/components/desktop/DesktopClientRow.tsx`** (around line 428)

### Part 5: One-time data fix

Execute database operations to fix the 3 existing issues:
- **SHREEISH BAHADUR SHRESTHA** (`2026-02-27T08:06:02.276Z`): Insert 3 skeleton rows for BRIDE'S RECEPTION, WEDDING BS, PRE+RECEPTION
- **LAJJA UPRETY** (`2026-01-26T05:56:54.428Z`): Insert 1 row for BRIDE'S MEHNDI (Baisakh 5, 2026-04-18). Also update the stale "HALDI+MEHNDI" row to "BRIDES HALDI" to match the current client record
- **FUNNY BHUSAN** (`2026-01-26T06:13:50.728Z`): Delete 3 orphan rows

## Architecture Confirmation

This change ensures `freelancer_assignments` stays 1:1 with the events list in `clients_cache` without waiting for a Google Sheets round-trip. The helper uses `upsert` with the existing composite unique constraint `(registered_date_time_ad, event, event_date_ad)` to prevent duplicates.

## Files Changed

1. `src/lib/freelancer-assignment-cache.ts` -- New `ensureFreelancerAssignmentRows()` helper
2. `src/pages/QuickAdd.tsx` -- Call helper in edit mode + add mode (BOOKED)
3. `src/pages/ClientDetail.tsx` -- Call helper after booking migration
4. `src/components/dashboard/FreshClientCard.tsx` -- Call helper after booking migration
5. `src/components/desktop/DesktopClientRow.tsx` -- Call helper after booking migration
6. One-time DB fix for 3 affected records

