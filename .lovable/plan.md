

## Fix Deliverables Sheet: Correct Event Dates + Redesign Layout

### Problems Found

1. **Wrong event dates**: The edge function uses `event_date_ad` from `clients_cache` (the client's primary event date) for ALL rows. Multi-event clients show the same date for every event. Fix: look up per-event dates from `event_details_cache`.

2. **Wrong deliverable type names**: The edge function looks for `album_bride`, `album_groom`, `album_other`, `insta_posts`, `overall_reels` — but the actual DB stores `bride_album`, `groom_album`, `other_album`, `insta_post`, `overall_reel`, `video_insta_post`. This means those columns always show NO/empty.

3. **OVERALL/ALBUM/PHYSICAL rows appear as separate "events"**: They use `event_name = 'OVERALL'`, `'ALBUM'`, `'PHYSICAL'` which get grouped as fake events. These should be columns on the client row, not separate rows.

### Redesigned Sheet Layout

One row per **real event** per client. Global items (overall, album, physical) appear only on the **first event row** of each client.

```text
A: Client Name
B: Event Date (AD)        ← from event_details_cache per event
C: Event Name
D: All Photos             (YES/NO)
E: Selected Photos        (YES/NO)
F: Selected Photos Crew   (plain text)
G: Insta Posts - Photos   (YES/NO)
H: Full Video             (YES/NO)
I: Full Video Qty
J: Full Video Names       (pipe → comma separated)
K: Highlights             (YES/NO)
L: Highlights Qty
M: Highlights Names       (pipe → comma separated)
N: Reel                   (YES/NO)
O: Insta Posts - Video    (YES/NO)
P: Overall Highlights     (YES/NO) ← first row only
Q: Overall Reels          (YES/NO) ← first row only
R: Album Bride            (YES/NO)
S: Album Bride Type
T: Album Groom            (YES/NO)
U: Album Groom Type
V: Album Other            (YES/NO)
W: Album Other Name & Type
X: Pendrive Qty
Y: Frame Qty
Z: Registered DateTime AD (ID for matching)
```

### Changes

**File: `supabase/functions/sync-deliverables-to-sheets/index.ts`**

1. **Fix type name mappings** — use actual DB values: `insta_post`, `video_insta_post`, `bride_album`, `groom_album`, `other_album`, `overall_reel`
2. **Look up per-event dates from `event_details_cache`** instead of `clients_cache.event_date_ad`
3. **Separate global vs per-event deliverables** — group real events (not OVERALL/ALBUM/PHYSICAL), then merge global columns onto the first event row
4. **Format `item_names`** — replace `|||` separator with `, ` for readability
5. **Format `photographer_toggles`** — parse JSON, output as `"PB: Arjun, PG: Nikit"` with role codes

