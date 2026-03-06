

## Sync Deliverables to "BOOKED CLIENTS DELIVERABLES" Sheet

### Human-Readable Sheet Layout

Instead of raw JSON columns, the sheet will have one row per client showing a flat, readable summary. Each client gets ONE row with all their deliverables flattened into clearly labeled columns.

```text
A: Client Name
B: Event Date (AD)
C: Event Name
D: All Photos (YES/NO)
E: Selected Photos (YES/NO)
F: Selected Photos Crew (e.g. "PB: Arjun, PG: Nikit")
G: Insta Posts - Photos (YES/NO)
H: Full Video (YES/NO)
I: Full Video Qty
J: Full Video Names
K: Highlights (YES/NO)
L: Highlights Qty
M: Highlights Names
N: Reel (YES/NO)
O: Insta Posts - Video (YES/NO)
P: Overall Highlights (YES/NO)
Q: Overall Reels (YES/NO)
R: Album Bride (YES/NO)
S: Album Bride Type
T: Album Groom (YES/NO)
U: Album Groom Type
V: Album Other (YES/NO)
W: Album Other Name & Type
X: Pendrive Qty
Y: Frame Qty
Z: Registered DateTime AD (hidden ID for matching)
```

This means: **one row per event per client**, all values are plain text YES/NO or simple strings. No JSON anywhere. A human can open the sheet and instantly understand what each client needs.

### Files to Change

1. **`supabase/functions/sync-deliverables-to-sheets/index.ts`** (new)
   - Same Google Auth pattern as `sync-crew-to-sheets`
   - Uses `GOOGLE_SPREADSHEET_ID` secret (already configured)
   - Auto-creates "BOOKED CLIENTS DELIVERABLES" tab + header row if missing
   - `push`: reads all `client_deliverables` where `synced_to_sheet = false`, groups by `(registered_date_time_ad, event_name)`, flattens into one row per event, finds/updates or appends in sheet
   - `fullSync`: clears sheet, rewrites all deliverables
   - Looks up `client_name` and `event_date_ad` from `clients_cache`

2. **`supabase/config.toml`** — add `[functions.sync-deliverables-to-sheets]` with `verify_jwt = false`

3. **`src/lib/deliverables-api.ts`** — change `synced_to_sheet: true` → `synced_to_sheet: false` in `saveDeliverable()`, add `syncDeliverablesToSheet()` function

4. **`src/components/suite/MasterSyncButton.tsx`** — currently a no-op stub; will remain unchanged (sync triggered from deliverables API or manually)

### Sync Trigger
- Every save marks `synced_to_sheet: false`
- The edge function is called via `syncDeliverablesToSheet()` which can be triggered manually or wired into any future sync chain

