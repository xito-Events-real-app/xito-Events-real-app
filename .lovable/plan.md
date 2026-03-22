
## Final fix plan: make Video Edit Tracker follow the exact Deliverables rule

### The rule to enforce
For every event:
1. **Full Video = ON by default**
2. **Highlights = ON by default**
3. If either one is explicitly turned **OFF** in Deliverables, that row must **disappear immediately** from Video Edit Tracker
4. If turned back **ON**, that row must **reappear immediately**
5. Other video deliverables should only appear when explicitly enabled

### Root cause in the current code
The current logic is still deciding at the **event level** instead of the **deliverable-type level**.

Right now:
- if an event has *any* deliverable record, the tracker stops using defaults for that whole event
- example from current data:
  - **SAJINA / MATERNITY SHOOT**
  - `full_video = false` exists in DB
  - `highlights` has **no row**
  - Deliverables UI shows Highlights as ON by default
  - but tracker wrongly treats the event as “configured” and removes both rows

So the bug is not the user rule — the bug is the current event-level sync logic.

### What I will change
#### 1) Rewrite `ensureVideoEditRows()` in `src/lib/video-edit-api.ts`
Make generation work **per deliverable type**:

For each event, compute an **effective enabled set**:
- `full_video` → enabled if:
  - there is no explicit row, or
  - explicit row exists with `enabled = true`
- `highlights` → enabled if:
  - there is no explicit row, or
  - explicit row exists with `enabled = true`
- `reel`, `video_insta_post`, `overall_*` etc. → enabled **only if explicit row exists and enabled = true**

Then generate tracker rows from that effective set only.

#### 2) Rewrite `syncWithDeliverables()` in `src/lib/video-edit-api.ts`
Make cleanup also work **per deliverable type**:

For every QUEUE row:
- keep it if its type is effectively enabled
- soft-delete it if its type is effectively disabled

This will make:
- `full_video OFF` => remove only Full Video
- `highlights missing` => keep Highlights because it is default ON
- `highlights OFF` => remove Highlights immediately

#### 3) Use the same default naming pattern as Deliverables
To avoid mismatches, the tracker should use the same implied defaults as Deliverables:
- default Full Video name = event name
- default Highlights name = event name

That prevents row-key mismatches between:
- implicit default rows
- later explicit saved rows from Deliverables

#### 4) Keep realtime, but make it reliable
The existing realtime subscription in `useVideoEditTracker.ts` is correct in structure.
I will keep that flow, but the fixed type-aware generation/cleanup will make the realtime result correct:

`client_deliverables change`
→ `ensureVideoEditRows()`
→ `syncWithDeliverables()`
→ `loadRows()`

This gives the instant behavior you want while editing Deliverables.

### Files to update
1. `src/lib/video-edit-api.ts`
   - replace event-level default logic with type-level default logic
   - add shared helper for “effective enabled deliverables”
   - align default sub-item naming with Deliverables
2. `src/hooks/useVideoEditTracker.ts`
   - keep realtime subscription, only adjust if needed for stability after API rewrite

### Expected result after this fix
Using your simple rule:
- Full Video + Highlights appear by default
- turning OFF Full Video removes only Full Video
- turning OFF Highlights removes only Highlights
- turning them back ON restores them
- changes reflect in Video Edit Tracker immediately
- no more accidental deletion of one row because another row was edited

### Validation cases I will use
1. Event with **no saved deliverable rows** → show Full Video + Highlights
2. Event with **only `full_video = false`** → show Highlights only
3. Event with **only `highlights = false`** → show Full Video only
4. Event with **both false** → show nothing
5. Event with **reel = true** → show Reel also
6. Toggle OFF/ON from Deliverables while tracker is open → tracker updates instantly
