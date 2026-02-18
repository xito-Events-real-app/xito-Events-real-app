
# End-to-End Test Plan: Desktop View — Full Supabase-First Flow

## What Was Implemented (Summary)

All 13 write operations across 4 files are now Supabase-first:

| File | Handlers Converted |
|---|---|
| `src/lib/timestamp-utils.ts` | `computePaymentUpdate()` added |
| `src/lib/clients-supabase-cache.ts` | `migrateClientToBookedInCache()` added |
| `src/components/desktop/DesktopClientRow.tsx` | 11 handlers: `handleCall`, `handleStatusChange`, `handleHandlerChange`, `handleMindsetChange`, `handleSaveQuotation`, `handleSaveClientBargain`, `handleSaveCounterRate`, `handleAddComment`, `handleSaveFinalQuotation`, `handleSaveAdvancePendingQuotation`, `handleSaveBookedPayment` |
| `src/components/dashboard/ClientDetailSheet.tsx` | `handleSave` |

## Test Sequence

### Step 1 — Access Desktop View

1. Log in at `/login`
2. Once on the dashboard, click the Monitor icon (top-right) to toggle Desktop Mode
3. Data loads from the Supabase cache — the client table should appear with status categories

### Step 2 — Log a Call

1. Find any client in the table with a phone number
2. Click the phone icon (Direct Call) or WhatsApp icon
3. **Expected:** Toast "DIRECT call logged" appears instantly — no waiting
4. **Expected:** The call count badge on that row increments immediately
5. **Verify in background:** After ~5-10 seconds, open the Client Detail page for that client and confirm the call log entry matches the format `H:MM AM/PM DIRECT (YYYY-MM-DD)` at the top

### Step 3 — Change a Status

1. On the same client row, click the status dropdown
2. Select a status that does NOT trigger an interception dialog (e.g. "CALL NOT RECEIVED", "TEXTED", "NUMBER PROVIDED")
3. **Expected:** Status badge updates instantly on the row — no spinner wait
4. **Expected:** Toast appears immediately
5. If you select "QUOTATION SENT": the quotation dialog opens — fill in amounts, submit — status + quotation both update instantly

### Step 4 — Add a Comment

1. Expand the client row (click the chevron) or use the comment dialog button
2. Type a comment and submit
3. **Expected:** Comment appears instantly in the expanded view
4. **Expected:** Toast "Comment added" shows without delay

### Step 5 — Change Handler / Mindset

1. Use the Handler dropdown on the row to assign a handler
2. Use the Mindset dropdown to set a mindset
3. **Expected:** Both update instantly in the row with a toast — no loading indicator

### Step 6 — Save a Quotation (Quotation Dialog Path)

1. Find a client in "JUST ENQUIRED" or early-stage status
2. Change status to "QUOTATION SENT" — the quotation dialog should intercept
3. Enter NPR amounts for at least one package tier
4. Click Save
5. **Expected:** Dialog closes instantly, status shows "QUOTATION SENT", quotation data visible in expanded row — all before any Sheets response

### Step 7 — BOOKED Migration with Payment (Critical Path)

This is the most complex test. Find a client in "ADVANCE PENDING" status with a final quotation already set.

1. Click the status dropdown and select "BOOKED"
2. **Expected:** The BOOKED payment dialog opens (intercept)
3. Enter a payment amount, select type (ADVANCE), pick a date on the Nepali calendar, select a bank
4. Click "Book & Record Payment"
5. **Expected (instant — before any network response):**
   - Dialog closes
   - Status row shows "BOOKED" badge
   - Payment field shows the new payment entry
   - Remaining payment updates
   - Toast "Payment recorded & status updated to BOOKED"
6. **Expected (background — after ~5-30 seconds):**
   - Google Sheets "CLIENT TRACKER" moves the row to "BOOKED CLIENTS" sheet
   - Payment entry appears in Column AE in format: `NPR X,XXX/- AS ADVANCE ON WED 2082-10-12 IN BANK NAME`
   - Remaining payment formula in Column AG updates

### Step 8 — Edit Client via ClientDetailSheet

1. Click on a client name to open the Client Detail Sheet (bottom drawer)
2. Click the pencil/edit icon
3. Change the client name or a contact number
4. Click the checkmark Save
5. **Expected:** Sheet closes instantly after Supabase write — no 2-4 second wait for Sheets response
6. **Expected:** The updated name/number reflects immediately in the table row

## What to Watch For (Failure Indicators)

- Any action that takes more than ~300ms to show feedback (indicates it is still awaiting Sheets) — this should NOT happen after the migration
- Console warnings starting with `[BACKGROUND-SHEETS]` are normal — these mean Sheets sync failed in the background but Supabase already has the data
- Console warnings starting with `[BACKGROUND]` indicate a Supabase cache write failure — these should be investigated
- If the BOOKED payment format in Sheets shows `NPR 30000/-` (no commas) instead of `NPR 30,000/-`, the `computePaymentUpdate` formatter is not being used correctly

## Technical Notes (For Reference)

- All handlers use the pattern: instant local state update → Supabase write → background Sheets sync with `.catch(err => console.warn(...))`
- The BOOKED migration uses `migrateClientToBookedInCache()` which atomically sets `sheet_source: 'booked'` and `synced_to_sheet: false` — this is the single Supabase write that guarantees data safety before the Sheets migration runs
- Payment string format produced by `computePaymentUpdate()`: `NPR {en-IN localized amount}/- AS {TYPE} ON {WEEKDAY} {BS-date} IN {BANK}` — weekday derived using local-timezone `new Date(year, month-1, day)` constructor to avoid UTC offset issues
- Cache invalidation after BOOKED migration fires `notifyCacheUpdate('booked-clients-invalidate')` — the Booked Clients module should auto-refresh and show the newly booked client
