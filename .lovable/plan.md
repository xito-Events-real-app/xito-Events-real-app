

# Fix ALL CLIENTS: Instant Load + Quick Add Freelancer

## Problem 1: Syncing blocks the UI

Even though the sync runs "in the background," it sets `setSyncing(true)` which triggers a full-screen spinner ("Syncing booked clients...") that replaces the entire table. The user sees nothing until the sync completes.

**Fix**: Make the background sync truly non-blocking by NOT setting `syncing` state during silent syncs. Only show the syncing spinner when the user explicitly clicks "Sync Clients."

Changes in `handleSync`:
- Add a parameter to control whether to show the syncing UI
- Silent syncs skip `setSyncing(true)` entirely so the table stays visible

Also, the loading state check currently shows a spinner even during sync. Change the render logic so the table is shown whenever we have data (from cache or fetch), regardless of background sync status.

## Problem 2: "Add New Freelancer" dialog doesn't appear

The `QuickAddFreelancerDialog` uses a Radix `Dialog` which renders its content via a portal. Since the ALL CLIENTS overlay is `z-[100]`, the dialog (default z-index ~50) renders behind it and is invisible.

**Fix**: Add `className="z-[200]"` to the `DialogContent` in `QuickAddFreelancerDialog.tsx`.

---

## Technical Details

### File 1: `src/components/suite/AllClientsCrewTable.tsx`

**Make background sync non-blocking (lines 93-106):**
- Change `handleSync` to accept a `showUI` flag (default `true`)
- Only call `setSyncing(true/false)` when `showUI` is true
- The silent background sync on mount and the 30-min interval pass `showUI=false`

**Fix render logic (around line 269):**
- Currently: if `syncing` is true, show full-screen spinner (hides table)
- Change: only show syncing spinner if `syncing && assignments.length === 0` (no cached data)
- If we have data, show the table with a small non-blocking sync indicator in the header instead

### File 2: `src/components/suite/QuickAddFreelancerDialog.tsx`

**Fix dialog z-index (line 43):**
- Change `<DialogContent className="sm:max-w-sm">` to `<DialogContent className="sm:max-w-sm z-[200]">`

---

## Changes Summary

| File | Change |
|------|--------|
| `AllClientsCrewTable.tsx` | Make silent sync skip `setSyncing` state; only show full-screen spinner when no data; table renders instantly from cache/fetch |
| `QuickAddFreelancerDialog.tsx` | Add `z-[200]` to DialogContent so it appears above the overlay |

