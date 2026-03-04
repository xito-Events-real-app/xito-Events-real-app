

## Plan: Fix Sheet Columns T/U, Clean Data, Re-upload with Backup Filter

### Problem
1. Sheet columns T and U still show old headers "DRIVE UPLOAD" and "DRIVE LINK" because headers were never overwritten on the existing sheet
2. User wants all existing sheet data cleaned and only files with at least first backup re-uploaded
3. Date columns need correct formatting

### Changes

**1. `supabase/functions/google-sheets/index.ts`** — Update `pushFilesToSheetAction`:
- Add a new mode: when `data.fullClean` is true, clear the entire sheet first (delete all rows below header), rewrite the header row (fixing T/U to "CLOUD NAME" / "DRIVE LINK"), then reset `synced_to_sheet = false` for all files that have a first backup (`final_generated_path != ''`), and push them all
- Change the default filter: always only push files that have at least first backup (`final_generated_path` is not empty), remove the `onlyWithBackup` parameter
- Fix date formatting in `mapRow`: for timestamp fields like `backup_1_recorded_at`, `backup_2_recorded_at`, `backup_3_recorded_at`, and `updated_at`, format them as locale-aware strings (e.g., "Mar 4, 2026 2:30 PM") instead of raw ISO strings

**2. `src/lib/files-api.ts`** — Update `pushFilesToSheets`:
- Change to always pass `onlyWithBackup: true` (or remove the flag since it'll be the default)
- Add a new function `cleanAndResyncFilesToSheets()` that calls with `{ action: "pushFilesToSheet", data: { fullClean: true } }`

**3. `src/lib/files-push-scheduler.ts`** — No change needed (auto-push will use the updated default)

**4. Trigger the clean**: After deploying, we'll call `cleanAndResyncFilesToSheets()` once from the UI or provide a button. Alternatively, the edge function change itself will handle the bootstrap if the header is stale.

### Approach Detail

In the edge function `pushFilesToSheetAction`:
- Always filter: `query.neq('final_generated_path', '').not('final_generated_path', 'is', null)` — no files without backup get pushed
- When `fullClean` flag is set:
  1. Clear entire sheet content below header: `PUT` empty values or use `clear` API
  2. Rewrite header row A1:Y1 with corrected headers
  3. Reset ALL files with backup to `synced_to_sheet = false`
  4. Re-query and push them all
- The bootstrap logic already handles empty sheets, so after clearing it will pick up all backed-up files

### Files to modify
1. `supabase/functions/google-sheets/index.ts` — filter logic + fullClean mode + header fix
2. `src/lib/files-api.ts` — add `cleanAndResyncFilesToSheets()`, update default to `onlyWithBackup: true`

