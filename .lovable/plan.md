

# Remove Refresh/Sync from All Clients Page + Delete Unwanted Event

## Problem
Clicking "Refresh" on the All Clients page triggered a pull from Google Sheets (`sync-crew-to-sheets` with `action: 'pull'`), which brought in an unwanted duplicate event row: **LAJJA UPRETY - HALDI+MEHNDI - Baisakh 4, 2083**. This violates the cache-only architecture where the database is the source of truth.

## Changes

### 1. Delete the unwanted event row
- Delete `LAJJA UPRETY - HALDI+MEHNDI` (Baisakh 4, 2083) from `freelancer_assignments` table (ID: `285d4065-6170-4eae-8e2c-e96f5fc30d77`)

### 2. Remove "Sync Clients" and "Refresh" buttons from toolbar
- **File**: `src/components/suite/AllClientsCrewTable.tsx`
- Remove the two `<Button>` elements at lines 585-592 ("Sync Clients" and "Refresh")

### 3. Remove auto-sync on mount and periodic sync interval
- Remove the `handleSync(true)` call on mount (line 281)
- Remove the `setInterval(() => handleSync(true), SYNC_INTERVAL)` (line 283)
- Remove the `clearInterval(interval)` cleanup
- Keep the `loadData()` call on mount (reads from cache only) and the event listeners

### 4. Remove `handleRefresh` function and its state
- Remove `handleRefresh` callback (lines 245-252)
- Remove `refreshing` state (line 112)
- Remove the `fromSheets` parameter from `loadData` -- it should always load from cache only, never pull from sheets
- Remove the `sync-crew-to-sheets` pull invocation inside `loadData` (lines 198-210)

### 5. Simplify `handleSync` to push-only
- Keep `handleSync` but remove the sheet-pull path. It becomes a push-only function (pushes local changes to sheets, then reloads from cache).
- Remove `SYNC_INTERVAL` constant since periodic sync is removed
- Remove `syncing` state and `syncingRef` since the sync button is gone (push is handled by the existing `pendingSyncs` button)

### 6. Remove one-time reconciliation pull
- The reconciliation logic (lines 217-240) that detects missing booked clients and triggers a `sync-crew-to-sheets` pull should also be removed, as it contradicts the cache-only architecture.

## What stays
- `loadData()` (cache-only read from `freelancer_assignments` table)
- The `pendingSyncs` push button (pushes local edits to sheets) -- this is write-only, not read
- Download/Upload backup CSV buttons
- Lock Empty Slots, Expand All buttons
- Event listeners for `clients-invalidate` and `booked-clients-invalidate`
