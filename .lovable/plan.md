
Goal: stop recurring disappearance of booked clients (e.g., Funny Bhusan), identify exact regression path, and apply a safe fix sequence that prevents further data loss before any more status/payment actions.

What I verified from your code + backend state:
1) The current migration path is still fragile:
- `migrateClientToBookedInCache` sets:
  - `sheet_source = 'booked'`
  - `row_number = 0`
  - `synced_to_sheet = true`
- Then it schedules push, but because `synced_to_sheet = true`, push ignores that row.
- This design assumes the background `updateClientStatus(...)` always succeeds and always gets enough identity info.

2) In all 3 BOOKED payment handlers (`DesktopClientRow`, `ClientDetail`, `FreshClientCard`):
- After cache migration, code calls:
  - `updateClientStatus(rowNumber, newStatus, currentStatusLog)`
- But this call currently does NOT pass `registeredDateTimeAD`.
- In backend `google-sheets` function, routing is strongest when `registeredDateTimeAD` is provided; without it, it can fall back to raw row-based behavior on tracker path.
- That creates a race/failure window: DB says booked, sheet move may fail/target wrong row, and later sync can remove that record from cache if not present in sheets.

3) Current live DB check confirms symptom direction:
- Funny Bhusan currently not found in `clients_cache`.
- `searchClients` via backend function also returns no Funny Bhusan in sheets.
- Namuna exists as booked with synced=true and valid row_number.
- This means the client is being lost at sheet/source level again, not just hidden in UI.

4) Secondary issue seen in console (separate from data loss):
- React warning: function components receiving refs (`Badge`, `CalendarDayPopup` via `asChild` patterns).
- This is UI technical debt but not the cause of missing client records.

Root cause (final):
A brittle “DB flip first, sheet move in background” flow combined with `synced_to_sheet=true` and `row_number=0` causes orphaned booked rows when background move is not guaranteed. Once sheet no longer contains that client, subsequent pull sync overwrites/deletes synced cache rows, making the client disappear again.

Emergency stabilization plan (sequenced to minimize risk):

Phase 1 — Immediate containment (stop further corruption)
1. Temporarily disable BOOKED transition from payment dialogs (or guard it) so users cannot trigger the risky path while patch is applied.
2. Add explicit failure handling:
- If background move fails, immediately mark row unsynced and surface destructive warning toast (not silent console warning).

Phase 2 — Correct migration contract (single reliable source of truth per transition)
3. Update `migrateClientToBookedInCache` contract:
- keep `row_number = 0` (good safety against overwrite),
- change `synced_to_sheet` strategy so move is not considered complete until sheet move is confirmed.
4. Ensure `updateClientStatus` call includes identity:
- pass `registeredDateTimeAD` in all 3 locations so backend routes by unique ID, not stale row.
5. Promote move to “must-succeed” behavior for BOOKED action:
- either await move result before finalizing local success state,
- or if non-blocking UX retained, write a deterministic retry marker and queue guaranteed retries until success.

Phase 3 — Hard backend safeguards
6. In `google-sheets` `updateClientStatus`:
- require/strongly validate `registeredDateTimeAD` for BOOKED transitions,
- reject BOOKED updates that cannot resolve identity safely.
7. In `sync-clients-to-sheets` push:
- keep append safety for booked rows with invalid row number,
- do NOT mark tracker-invalid rows as synced when skipped (currently can hide unsynced problems).
8. In pull logic:
- protect recently updated local rows from destructive replacement using `updated_at` comparison (already done in some paths; enforce consistently for clients pull path too).

Phase 4 — Data repair + verification
9. Reinsert Funny Bhusan from provided source record (again), but only after code safeguards are in place.
10. Run verification queries:
- presence in `clients_cache` (booked, valid row_number),
- presence in booked sheet via backend lookup.
11. Run controlled test:
- migrate one test lead to BOOKED with advance payment,
- add second payment,
- refresh app and run pull,
- confirm both old restored client and new booked client persist.

Phase 5 — Monitoring & rollback safety
12. Add temporary audit logs around BOOKED transition:
- regId, old/new sheet source, row_number before/after, updateClientStatus result.
13. Add alert-level logs when:
- `sheet_source='booked' AND row_number<2 AND synced_to_sheet=true` persists > N minutes.
14. Keep one-click manual recovery SQL template for missing client restore by regId.

Files that need implementation updates:
- `src/lib/clients-supabase-cache.ts`
- `src/components/desktop/DesktopClientRow.tsx`
- `src/pages/ClientDetail.tsx`
- `src/components/dashboard/FreshClientCard.tsx`
- `src/lib/sheets-api.ts` (extend updateClientStatus signature to include registeredDateTimeAD)
- `supabase/functions/google-sheets/index.ts`
- `supabase/functions/sync-clients-to-sheets/index.ts`

Technical implementation notes:
- Frontend API change:
  - `updateClientStatus(rowNumber, newStatus, existingStatusLog, registeredDateTimeAD?)`
  - send `registeredDateTimeAD` in function payload.
- BOOKED flow should not show success toast until move success (or clearly label as “pending sync” with visible retry status).
- Avoid silent `.catch(console.warn)` for destructive workflows.
- Keep `row_number` invalidation on transition, but only mark synced after confirmed placement in booked sheet.

Acceptance criteria:
1) No booked client disappears after adding payments.
2) Funny Bhusan remains visible after refresh + pull cycle.
3) BOOKED migration is identity-based (regId), never stale-row-based.
4) Failed move cannot silently result in “synced=true”.
5) DB + sheet row counts remain stable across multiple payment updates.

Also queued (non-blocking cleanup):
- Fix ref warnings by converting `Badge` and `CalendarDayPopup` to `forwardRef` or removing invalid `asChild` ref paths in dashboard/tooltip contexts.
