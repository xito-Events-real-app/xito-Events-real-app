

## Fix: Deliverable-Disabled Items Still Appearing in Video Edit Tracker

### Root Cause
Both `ensureVideoEditRows` and `syncWithDeliverables` only query `enabled = true` deliverables. When a user disables ALL video deliverables for an event (e.g. switches off Full Video), the system sees zero enabled rows and falls back to creating default "Full Video + Highlights" rows — defeating the purpose.

### The Fix — `src/lib/video-edit-api.ts`

#### In `ensureVideoEditRows` (step 5 + step 6):
- Load ALL deliverables (both enabled and disabled) for the `video` and `overall` sections — not just enabled ones.
- Track two maps:
  - `enabledDeliverablesMap` — only enabled items (used to generate rows)
  - `hasAnyDeliverablesMap` — all items including disabled (used to decide if client has configured deliverables)
- Change the default branch (line 237): Only generate default "Full Video + Highlights" if `hasAnyDeliverablesMap` does NOT have ANY records for that client+event. If records exist but all are disabled → generate nothing.

#### In `syncWithDeliverables` (step 3 + step 4):
- Same approach: load ALL deliverables (enabled + disabled) to build a `hasAnyConfigured` set.
- Change line 376-382: If `hasAnyConfigured` has the group key but `hasConfiguredDeliverables` (enabled only) does NOT → soft-delete all QUEUE rows for that event (client configured deliverables but disabled all).

### Summary of logic change
```
Before: no enabled deliverables → "not configured" → keep/create defaults
After:  no deliverable records at all → "not configured" → keep/create defaults
        has records but all disabled → "configured, all off" → delete/skip defaults
```

### Files changed
1. `src/lib/video-edit-api.ts` — fix both functions to distinguish "never configured" vs "all disabled"

