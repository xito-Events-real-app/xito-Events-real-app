

# Fix: Payment Data Disappearing After Reload in Finance Manager

## Root Cause

The `resyncAllBookedClients` function copies payment data **from CLIENT TRACKER to BOOKED CLIENTS** (columns AE, AF, AG). However, per the single-source-of-truth architecture, payments are **only written to BOOKED CLIENTS**. The CLIENT TRACKER has empty or stale payment columns.

When the "Resync" button is clicked in Finance Manager (or any resync trigger), it reads the CLIENT TRACKER's empty payment columns and **overwrites** the real payment data in BOOKED CLIENTS, effectively deleting it.

The edge function logs confirm this: after payments were recorded for GEETA and WILLIAM, a resync ran and "Synced row 6 from tracker row 14" -- overwriting the just-recorded payments with stale tracker data.

## Fix

Modify the `resyncAllBookedClients` function in the edge function to **reverse the sync direction for payment columns** -- payment data should flow FROM BOOKED CLIENTS TO CLIENT TRACKER (not the other way around), or simply be skipped entirely since the tracker is not the source of truth for payments.

The simplest and safest fix: **remove payment column syncing entirely** from `resyncAllBookedClients`, since payments should never be copied between sheets. The BOOKED CLIENTS sheet is the single source of truth for payment data.

## Technical Changes

### File: `supabase/functions/google-sheets/index.ts`

**Function: `resyncAllBookedClients` (lines ~5030-5146)**

Current behavior (BROKEN):
- Reads payment columns (AE-AG) from CLIENT TRACKER
- Overwrites BOOKED CLIENTS payment columns with tracker data

New behavior (FIXED):
- Reads NON-payment columns (A-AD, AH-AI) from CLIENT TRACKER
- Syncs only non-payment data to BOOKED CLIENTS
- Payment columns (AE, AF, AG) are never touched -- they remain in BOOKED CLIENTS as-is
- Optionally: sync payment data in reverse direction (BOOKED to TRACKER) for backup visibility

Specifically:
1. Change the comparison logic to skip columns 30, 31, 32 (AE, AF, AG) when determining `needsUpdate`
2. When updating, only write non-payment columns from tracker to booked
3. Preserve existing BOOKED CLIENTS payment data untouched

### Changes in detail:

```typescript
// REMOVE: Syncing payment data from tracker to booked
// BEFORE (lines ~5107-5129):
// Compares tracker payment columns to booked and overwrites booked

// AFTER:
// Compare only non-payment columns (e.g., client name, event data, handler, etc.)
// Skip columns 30, 31, 32 entirely in the needsUpdate check
// Only update non-payment columns A-AD and AH+ from tracker to booked
```

The function should either:
- **Option A (Recommended):** Skip payment columns entirely -- compare and sync only columns 0-29 and 33+ between tracker and booked
- **Option B:** Reverse direction -- copy payment data from BOOKED to TRACKER for visibility, but never overwrite BOOKED

## Impact

- Payments recorded in Finance Manager will persist across reloads
- The Resync button will still sync non-payment data (client details, handler, events, etc.)
- No other modules are affected since they all respect the single source of truth architecture

## Files to Modify

1. `supabase/functions/google-sheets/index.ts` -- Fix `resyncAllBookedClients` function

