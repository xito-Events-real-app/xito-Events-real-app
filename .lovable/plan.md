
Short answer: not “perfectly” by itself. It will fix the core path, but to fully solve your exact Ashmita case we need one extra recovery step.

What I verified right now:
- In backend cache, Ashmita is marked as:
  - `sheet_source = booked`
  - `row_number = 42`
  - `synced_to_sheet = true`
- But in Google Sheet lookup, the same `registeredDateTimeAD` is still in:
  - `CLIENT TRACKER` row 2
  - status still old (`CALLED : QUOTATION PENDING`)
- So this is a real data mismatch (app/backend state and sheet state diverged).

Why this happens:
1) Client detail BOOKED flow still has this guard:
   - `if (client.rowNumber && client.registeredDateTimeAD) { ... }`
   - If `rowNumber` is 0/falsy at that moment, sheet MOVE call is skipped.
2) Backend `updateClientStatus` still hard-fails early when `rowNumber < 2` before fully using ID-based recovery:
   - `throw new Error('Valid rowNumber is required for updating status')`
3) Non-BOOKED status flow in `performStatusChange` updates local/backend cache, but does not call sheet status update directly, so sheet can lag/drift for some paths.

What will fully fix your problem:
1) Frontend guard fix (ClientDetail BOOKED path)
   - Change condition to ID-first:
   - from `if (client.rowNumber && client.registeredDateTimeAD)`
   - to `if (client.registeredDateTimeAD)`
2) Backend status update hardening (google-sheets function)
   - Allow `updateClientStatus` to continue when `registeredDateTimeAD` exists even if row is <2.
   - Resolve actual row via ID lookup first, then write.
3) Ensure status sync is triggered for normal status changes too
   - Add background `updateClientStatus(...)` call in `performStatusChange`.
4) One-time reconciliation for already-stuck clients (including Ashmita)
   - Detect records marked booked in backend but still present in tracker sheet.
   - Execute proper MOVE (copy to Booked, delete from Tracker) for those records.

Timing expectation after fix:
- Normally sheet update should appear in about 5–30 seconds.
- If it takes more than 1–2 minutes, that indicates a sync error, not normal delay.

Acceptance test after implementation:
1) Add a fresh client.
2) Change status to BOOKED with payment.
3) Confirm in under 30 seconds:
   - row exists in BOOKED CLIENTS sheet
   - same ID no longer exists in CLIENT TRACKER
4) Confirm non-BOOKED status changes also reflect in sheet.

This gives a reliable fix for both future updates and the already-broken Ashmita record.
