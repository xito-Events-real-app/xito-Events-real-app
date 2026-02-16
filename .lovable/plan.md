

# Make Everything Supabase-First: Instant Saves Across the Entire App

## Overview

Apply the same "Supabase-first" pattern used for Benzo Keep notes to **every write operation** in the app. Instead of waiting 2-5 seconds for Google Sheets to respond, every action will:

1. Update local state + Supabase cache **instantly**
2. Show success toast and close dialogs immediately
3. Sync to Google Sheets **in the background** (non-blocking)

This makes the entire app feel instant for all users.

## Operations to Convert

Here are all the write operations on the Client Detail page that currently block on Google Sheets:

| Operation | Current Wait | After |
|-----------|-------------|-------|
| Log Call (Direct/WhatsApp) | 2-5s | Instant |
| Change Status | 2-5s | Instant |
| Save Quotation | 2-5s | Instant |
| Save Final Quotation (Advance Pending) | 2-5s | Instant |
| Save Bargaining Rates | 2-5s | Instant |
| Save Final Quotation Only (Booked) | 2-5s | Instant |
| Add Comment | 2-5s | Instant |
| Update Priority (Star Rating) | 2-5s | Instant |
| Add Client (Quick Add) | 2-5s | Instant |

**Note**: The "BOOKED + Payment" flow and "Payment" operations will stay Sheets-first because they involve moving rows between sheets and financial records that need guaranteed consistency.

## How It Works

For each operation, the pattern is:

```
BEFORE: await sheetsAPI() -> update local state -> update cache -> toast
AFTER:  update local state + cache instantly -> toast -> sheetsAPI() in background
```

## Technical Details

### File: `src/pages/ClientDetail.tsx`

**1. `handleCall` (Log Call)**
- Compute the new call log string locally (timestamp + type + existing log)
- Update state + cache immediately
- Fire `logCallAttempt()` in background

**2. `performStatusChange` (Change Status)**
- Compute the new status log string locally (timestamp + new status + existing log)
- Update state + cache immediately
- Fire `updateClientStatus()` in background
- **Exception**: Status changes to BOOKED stay synchronous (row migration required)

**3. `handleSaveQuotation` (Quotation Sent)**
- Update quotation data + status log in state + cache immediately
- Fire `updateClientQuotation()` and `updateClientStatus()` in background

**4. `handleSaveAdvancePendingQuotation` (Advance Pending)**
- Update final quotation + status log in state + cache immediately
- Fire `updateFinalQuotation()` and `updateClientStatus()` in background

**5. `handleSaveBargaining` (Bargaining)**
- Update bargaining rates + status log in state + cache immediately
- Fire `updateBargainingRates()` and `updateClientStatus()` in background

**6. `handleSaveFinalQuotationOnly` (Edit Final Quotation for Booked)**
- Update final quotation in state + cache immediately
- Fire `updateFinalQuotation()` in background

**7. `handleAddCommentDirect` (Add Comment)**
- Compute new comments string locally (timestamp + comment + existing)
- Update state + cache immediately
- Fire `addClientComment()` in background

**8. `handlePriorityChange` (Star Rating)**
- Update priority in state + cache immediately
- Fire `updateClientPriority()` in background

### File: `src/pages/QuickAdd.tsx`

**9. `handleSubmit` (Add New Client)**
- Generate the client data locally
- Insert directly into `clients_cache` via Supabase (instant)
- Update memory cache
- Fire `addClient()` to Sheets in background
- Navigate away immediately

### Helper: Local Timestamp Generation

Several operations (status change, call log, comments) need timestamps that are currently generated in `sheets-api.ts` before calling the API. We will extract these into a shared utility so the same timestamp format is used for both the local optimistic update and the background Sheets sync.

A small utility function `generateClientTimestamp()` and `generateCallLogEntry()` will be added to `src/lib/sheets-api.ts` (or a new `src/lib/timestamp-utils.ts`) so the local state update produces the exact same formatted string that the Sheets API would return.

### What Stays Synchronous (Sheets-First)

These operations will NOT be converted because they require server-side coordination:

- **BOOKED status change + payment** - Moves rows between sheets; needs sequential guarantee
- **Add Payment** - Financial data that must be recorded accurately with remaining balance calculation
- **Client Sync (Resync button)** - Explicitly pulls fresh data from Sheets
- **Master Sync** - Full data refresh
- **Edit Client (full form)** - Complex multi-field update that modifies many columns

### Error Handling

If a background Sheets sync fails:
- Log a warning to console (no error toast - data is safe in Supabase)
- The `synced_to_sheet: false` flag in `clients_cache` tracks unsynced records
- The next Master Sync or manual Resync will reconcile everything
- The existing `pushUnsyncedToSheets()` function already handles pushing unsynced records

## Files Modified

| File | Change |
|------|--------|
| `src/pages/ClientDetail.tsx` | Convert 8 handlers to Supabase-first pattern |
| `src/pages/QuickAdd.tsx` | Convert addClient to write to Supabase cache first |
| `src/lib/timestamp-utils.ts` (new) | Shared timestamp formatting for local optimistic updates |

## Impact

- Every action in the app feels **instant** (0-50ms instead of 2-5 seconds)
- All users see updates immediately via shared Supabase cache
- Google Sheets stays in sync via background writes
- No data loss risk - Supabase is the primary store, Sheets syncs in background
- Financial operations (payments) remain synchronous for accuracy
