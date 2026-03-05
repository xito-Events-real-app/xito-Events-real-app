

## What Happens When You Rename an Event

### Current Behavior (Problem)

When you change an event name (e.g., "WEDDING" → "RECEPTION") via the QuickAdd edit form, here's what happens to each table:

| Table | What happens | Status |
|---|---|---|
| **clients_cache** | `events` column updated | Works |
| **event_details_cache** | Old name row is **deleted**, new name row inserted as empty skeleton | **Logistics data LOST** (venue, parlour, timing, demands, references) |
| **freelancer_assignments** | Old name row is **deleted**, new skeleton row inserted | **Crew assignments LOST** (all photographer/videographer picks gone) |
| **freelancer_event_settings** | Nothing happens | **Orphaned rows** with old event name stay forever |
| **files_management** | Nothing happens | **Orphaned rows** — files still reference old event name |
| **contact_details_cache** | Not affected (per-client, not per-event) | OK |

### Root Cause

The QuickAdd edit sync logic (lines 354-430) matches events by exact `(event_name, event_month, event_day)`. When you rename an event, the old name doesn't match the new name, so it's treated as "old event removed + new event added" — deleting all associated data.

### Proposed Fix

Instead of delete-and-recreate, detect renames by matching on `event_index` position and **update** the event name in-place across all related tables.

**File: `src/pages/QuickAdd.tsx`** (edit mode event sync, ~lines 354-430)

1. First, update existing `event_details_cache` rows by `event_index` (positional match) — just change the `event_name`, `event_year`, `event_month`, `event_day`, `event_date_ad` columns without deleting the row, preserving all logistics data
2. Only delete rows where `event_index >= newEvents.length` (events truly removed from the end)
3. Only insert skeleton rows where `event_index` didn't exist before

**File: `src/lib/freelancer-assignment-cache.ts`** (`ensureFreelancerAssignmentRows`, ~lines 120-170)

4. Before inserting/deleting, detect renamed events by comparing old vs new lists positionally. If a row at position N has a different name, **update** that row's `event`, `event_year`, `event_month`, `event_day`, `event_date_ad` instead of deleting + re-inserting, preserving all crew assignments
5. Propagate the rename to `freelancer_event_settings` so visibility/note settings aren't orphaned
6. Propagate the rename to `files_management` rows matching the old event name + `registered_date_time_ad`

This ensures renaming "WEDDING" → "RECEPTION" updates the name everywhere while keeping all venue details, crew assignments, visibility settings, and file records intact.

