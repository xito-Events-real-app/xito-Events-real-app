
Goal: fix the immediate blocker first (app sometimes stuck on Loading in both desktop/mobile), then fix Ashmita’s missing event date in the desktop “All Clients” crew view by restoring data consistency between Booked Clients and freelancer assignments.

What I found:
1) Ashmita data exists with valid event date in booked clients cache
- `clients_cache` has `ASHMITA POUDEL` with:
  - `sheet_source = booked`
  - `event_year = 2082`, `event_month = 11`, `event_day = 16`
  - `event_date_ad = 2026-02-28`
2) Ashmita is missing from the source used by desktop “All Clients” crew table
- `freelancer_assignments` has no row for Ashmita.
- `AllClientsCrewTable` renders date from assignment rows (`row.eventDay`), so if assignment row is missing, date cannot appear there.
3) Regression identified in sync behavior
- `AllClientsCrewTable` now does push-only sync (`handleSync`), and no longer triggers pull/backfill.
- `handleRefresh` currently calls `loadData(true)` but `loadData` ignores `fromSheets`; this means refresh no longer backfills missing assignment rows.
4) Startup Loading risk area
- `ProtectedRoute` depends on `AuthContext.isLoading`.
- In `AuthContext`, `getSession()` has no `.catch`, and there is no timeout/failsafe. If auth bootstrap hangs/rejects in a bad network state, app can remain on loading screen indefinitely.

Implementation plan (in order):

Phase 1 — Unblock startup loading first (highest priority)
1. Harden auth bootstrap in `src/contexts/AuthContext.tsx`
- Wrap `supabase.auth.getSession()` in `try/catch/finally`.
- Add a defensive timeout (e.g. 8–10s) that forces `isLoading=false` and logs a warning if auth init stalls.
- Ensure timeout is cleared when session resolves.
- Keep existing listener-first pattern, but make it impossible to stay loading forever.
2. Add lightweight safety logging for init path
- Keep concise logs around auth init start/success/failure/timeout to diagnose future incidents without breaking UX.
3. Keep behavior unchanged for successful auth
- No route/auth UX redesign; just reliability.

Phase 2 — Fix missing event/date in desktop All Clients (Ashmita + future)
4. Restore data backfill path for freelancer assignments
- In `src/components/suite/AllClientsCrewTable.tsx`, make refresh/sync able to pull missing crew rows again (without overwriting local unsynced edits).
- Re-enable a controlled pull call via backend function (`sync-crew-to-sheets`, `action: 'pull'`) in explicit refresh flow and optionally one guarded first-load reconciliation.
- Keep regular auto-sync push-only for performance; use pull only when needed for reconciliation.
5. Add “missing assignment reconciliation” check
- Before/after loading assignments, detect booked clients that have no assignment rows (keyed by `registeredDateTimeAD` + per-event structure).
- If missing rows are detected, trigger one pull/reconcile call, then reload assignments.
- Guard with single-flight ref to avoid loops and duplicate calls.
6. Preserve current “local DB wins” conflict behavior
- Rely on existing pull protection in `sync-crew-to-sheets` (it already avoids replacing newer local unsynced data).
- Do not change assignment update contract.

Phase 3 — Desktop-priority validation for Ashmita
7. Verify on desktop suite flow specifically
- Open desktop mode.
- Navigate to All Clients crew table.
- Confirm Ashmita appears with correct event day/month bucket and date visible.
- Open Ashmita client detail and confirm consistency with upcoming events card.
8. Validate startup stability
- Hard refresh multiple times.
- Verify app never stays indefinitely on global loading in both mobile and desktop mode.

Files to modify (planned):
- `src/contexts/AuthContext.tsx`
  - Add robust init error handling + timeout failsafe.
- `src/components/suite/AllClientsCrewTable.tsx`
  - Reintroduce controlled pull/backfill path and missing-assignment reconciliation.
- (Optional small helper) `src/lib/freelancer-assignment-cache.ts` or `src/lib/freelancer-assignment-api.ts`
  - Add explicit `pullAssignmentsFromSheets()` wrapper if needed for clean call sites.

Risk and mitigation:
- Risk: pull reconciliation could be heavy if called too often.
  - Mitigation: trigger only on manual refresh and one guarded first-load check when missing rows detected.
- Risk: accidental overwrite of local edits.
  - Mitigation: keep existing backend conflict-protection logic (already implemented via updated_at + synced flags).
- Risk: auth timeout could surface login screen during transient slowness.
  - Mitigation: conservative timeout and clear fallback behavior; user can retry immediately.

Success criteria:
- App does not get stuck indefinitely on loading.
- Ashmita appears in desktop All Clients crew table with event date visible.
- Desktop “Upcoming Events” and All Clients/Client Detail show consistent event identity for the same client.
- No regression in manual assignment edits or push-to-sheet flow.
