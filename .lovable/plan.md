

## Fix: Generate Video Edit Rows for ALL Past Booked Events

### Root Cause

The current `generateVideoEditRows` only creates rows for clients who have **explicitly configured video deliverables** in the Deliverables section (`client_deliverables` table). Only 13 video deliverable entries exist across just 2-3 clients. Meanwhile, there are **61 past events** across all booked clients.

The user expects: every booked client's past event gets default video edit rows automatically — regardless of whether someone manually set up deliverables.

### Fix

**File: `supabase/functions/google-sheets/index.ts` — `generateVideoEditRows` function**

Change the approach completely:

1. **Primary source: `event_details_cache` + `clients_cache`** (not `client_deliverables`)
   - Query all events from `event_details_cache` joined with booked clients
   - Filter to only past events (`event_date_ad < today`, excluding unknown `**` dates)

2. **Default video types per event**: For every past event, generate these rows:
   - Full Video
   - Highlights
   
3. **Overlay deliverables data** (optional enrichment): If `client_deliverables` has enabled video entries for that client+event, use the item names and quantities from there. Otherwise use the event name as the sub-event name.

4. **Dedup** stays the same — check existing sheet rows by `registered_date_time_ad || event_name || subEventName || editType`.

### Logic

```text
For each booked client with past events:
  For each past event:
    If client_deliverables has video entries for this event:
      Use those (with quantities, item names, types)
    Else:
      Generate 2 default rows: Full Video + Highlights
    
    Skip if already in sheet (dedup)
    Append to sheet
```

### Expected Result
- ~61+ past events → ~120+ rows minimum (2 per event)
- Clients with configured deliverables get their specific entries (reels, insta posts, etc.)
- Auto-populates on page load when sheet is empty

### Files Changed
- `supabase/functions/google-sheets/index.ts` — Rewrite `generateVideoEditRows` to use events as primary source

