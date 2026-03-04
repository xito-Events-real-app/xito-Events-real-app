

## Problem

All 107 file rows have `synced_to_sheet = true` — they were marked as synced by the old 17-column logic before the new "BOOKED CLIENTS WTN FILES" tab existed. The push function only selects rows where `synced_to_sheet = false`, so it finds 0 rows and pushes nothing.

Only 2 rows have backup paths, so only those 2 should appear in the sheet.

## Fix

**File: `supabase/functions/google-sheets/index.ts`** — In `pushFilesToSheetAction`:

Add a one-time "force re-sync" mode: when the sheet tab is newly created (or empty with only a header row), reset `synced_to_sheet = false` for all qualifying rows before the push query runs. This ensures the initial population of the new tab.

Concretely:
1. After checking if the tab exists / reading existing rows, if the sheet has ≤1 row (just the header), run: `UPDATE files_management SET synced_to_sheet = false WHERE final_generated_path != '' AND final_generated_path IS NOT NULL`
2. Then the existing query (`synced_to_sheet = false`) will pick up those rows and push them

This is a safe one-time bootstrap — once rows are in the sheet, future edits set `synced_to_sheet = false` normally.

### Alternative (simpler, immediate)
Just reset the flag now via a migration or direct query, and the next push will populate the sheet. But adding the auto-bootstrap logic is more robust for future tab recreation.

### Recommendation
Do both:
1. Add auto-bootstrap logic in the edge function (if sheet has ≤1 row, reset synced flag for rows with backups)
2. This makes it self-healing — if the tab is ever deleted and recreated, it auto-populates

