
# Fix: Two Data Sync Issues

## Issue 1: Benzo Keep Notes Not Saving for Booked Clients (e.g., Shyam Poudel)

**Root Cause**: The `assignBenzoKeepNoteToClient` backend function only searches `'CLIENT TRACKER'` sheet (line 768). Booked clients like Shyam Poudel live exclusively in `'BOOKED CLIENTS'` sheet, so the function silently fails with `{ success: false }`.

**Fix**: Add a fallback search in `'BOOKED CLIENTS'` sheet when the client is not found in `'CLIENT TRACKER'`.

### File: `supabase/functions/google-sheets/index.ts`

In `assignBenzoKeepNoteToClient` (around line 795), after the tracker search fails (`targetRow === -1`):
- Search `'BOOKED CLIENTS'!A2:A1000` for the same `registeredDateTimeAD`
- If found, update `'BOOKED CLIENTS'!AL{row}` instead of `'CLIENT TRACKER'!AL{row}`
- Store which sheet was matched so the correct sheet name is used for read and write

---

## Issue 2: Freelancer Assignments from Client Detail Don't Appear in All Clients

**Root Cause**: When you assign a freelancer from the Client Detail page, `useFreelancerAssignments.updateAssignment()` calls `updateFreelancerAssignment()` which writes to Google Sheets only. It does NOT update the `freelancer_assignments` Supabase table. The All Clients crew dashboard reads from Supabase (`loadAssignmentsFromCache`), so the new assignment is invisible there until a manual "Pull" sync.

**Fix**: After the Google Sheets write succeeds, also update the Supabase `freelancer_assignments` cache table using `updateAssignmentInCache()`.

### File: `src/hooks/useFreelancerAssignments.ts`

In the `updateAssignment` callback (around line 62), after `updateFreelancerAssignment()` succeeds:
- Call `updateAssignmentInCache(registeredDateTimeAD, eventName, field, value, eventDateAD)` to sync the change to Supabase
- Import `updateAssignmentInCache` from `@/lib/freelancer-assignment-cache`
- Wrap in try/catch so a Supabase failure doesn't block the UI update

---

## Summary

| Issue | Root Cause | Fix File |
|---|---|---|
| Benzo Keep notes fail for booked clients | Only searches CLIENT TRACKER sheet | `supabase/functions/google-sheets/index.ts` |
| Freelancer not visible in All Clients | Writes to Sheets but not Supabase cache | `src/hooks/useFreelancerAssignments.ts` |
