

## Plan: Make Supabase the Absolute Source of Truth — Remove All Sheet-to-DB Pulls

### What's Happening Now (The Problem)

Three edge functions currently pull data FROM Google Sheets INTO Supabase, treating Sheets as the source of truth. This is what caused NIBISHA's data loss and potentially other clients:

| Edge Function | Pull Behavior | Destructive? |
|---|---|---|
| `sync-clients-to-sheets` | `action=pull`: deletes all synced rows, re-inserts from sheet | **YES — DELETE + re-insert** |
| `sync-all-data` | Pulls freelancers, vendors, logistics, dropdowns, contact_details, event_details — each with DELETE + re-insert | **YES — DELETE + re-insert** |
| `sync-crew-to-sheets` | `action=pull`: upserts from sheet with timestamp check | Safer but still overwrites |

### What We'll Change

**Remove ALL pull-from-sheet logic.** Supabase is the only database. Sheets only receive data (push/mirror). No edge function should ever read from Sheets and write into Supabase tables.

### Step 1: Restore NIBISHA MA'AM : PRARTHANA

Insert her full record back into `clients_cache` using the data you provided, with `synced_to_sheet = false` so the next push mirrors her back to the sheet.

### Step 2: Fix `sync-clients-to-sheets/index.ts`

- Remove the entire `action === 'pull'` branch (lines 146-301) — the destructive delete + re-insert from Sheets
- Change the default action from `'pull'` to `'push'` so accidental calls don't trigger a pull
- Keep only the `action === 'push'` logic (which writes DB → Sheets)

### Step 3: Fix `sync-all-data/index.ts`

This entire function is a pull-from-sheets function. Every one of its sub-functions (`pullFreelancers`, `pullVendors`, `pullLogistics`, `pullDropdowns`, `pullContactDetails`, `pullEventDetails`) reads from Sheets and destructively replaces DB data.

- **Remove the entire function body** — replace with a no-op that returns `{ success: true, message: 'Pull from sheets disabled. Supabase is source of truth.' }`
- This prevents any accidental calls from causing data loss

### Step 4: Fix `sync-crew-to-sheets/index.ts`

- Remove the `action === 'pull'` branch (lines 247-361) which reads crew assignments from Sheets into `freelancer_assignments`
- Keep only the push logic

### Step 5: Remove frontend `pullStorageDevices` caller

- In `src/lib/files-api.ts`, the `syncStorageDevicesFromSheets()` function calls `pullStorageDevices` — make it a no-op or remove it

### After These Changes

| Direction | Status |
|---|---|
| Supabase → Google Sheets (push) | **Working** — all push logic preserved |
| Google Sheets → Supabase (pull) | **Disabled** — no function can overwrite or delete DB data from Sheets |
| Data safety | **Guaranteed** — no client can ever be deleted because a sheet is missing their row |

