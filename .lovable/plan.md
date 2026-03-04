

## Plan: Auto-push files to sheet after backup is saved

### Problem
When a backup path is saved via `FilePathBuilderDialog`, it writes directly to Supabase but never calls `scheduleFilesPush()`. The push to Google Sheets only happens when using `useFilesManagement.update()` — but the dialog bypasses that for multi-card saves.

### Changes

**1. `src/components/files/FilePathBuilderDialog.tsx`**
- Import `scheduleFilesPush` from `@/lib/files-push-scheduler`
- After the save completes (line ~454, after `onRefresh`), call `scheduleFilesPush()` to trigger the 3-second debounced push to "BOOKED CLIENTS WTN FILES" sheet

**2. `src/lib/files-push-scheduler.ts`**
- Update the `scheduleFilesPush` function to add a filter: only push files where at least one backup exists (`final_generated_path` is not empty). This is already handled at the edge function level (it pushes all unsynced rows), but we can add a pre-filter in the push API call itself.

**3. `src/lib/files-api.ts` — `pushFilesToSheets()`**
- Update the query to only push rows where `final_generated_path` is not empty (i.e., at least one backup has been saved), so empty/unstarted file rows don't clutter the sheet.

This ensures: every time a user saves a backup path → `synced_to_sheet` is set to `false` → `scheduleFilesPush()` fires after 3 seconds → only rows with at least one backup get pushed to the sheet.

