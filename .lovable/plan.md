

## Critical Fix: Positional Matching Destroyed Shakti's Data + Code Rewrite

### What happened — the smoking gun

The `ensureFreelancerAssignmentRows` function uses **positional matching** (index 0, 1, 2...) instead of matching by event name. When you added POST-SHOOT for Chaitra 30, here's what the system did:

**Before your edit**, existing assignment rows sorted by `event_date_ad`:
```text
Position 0: POST SHOOT     (2026-03-**)  ← ** sorts first alphabetically
Position 1: BRIDE MEHNDI   (2026-03-10)
Position 2: WEDDING        (2026-03-12)
Position 3: PRE+RECEPTION  (2026-03-16)
```

**New event list** (from clients_cache):
```text
Position 0: BRIDE MEHNDI
Position 1: WEDDING
Position 2: PRE+RECEPTION
Position 3: POST-SHOOT
```

The system "renamed" by position, rotating ALL crew and files one step forward:
- POST SHOOT's empty crew → labeled as BRIDE MEHNDI
- BRIDE MEHNDI's real crew → labeled as WEDDING
- WEDDING's real crew → labeled as PRE+RECEPTION
- PRE+RECEPTION's real crew → labeled as POST-SHOOT

And the same cascade happened to `files_management` — all your file data with 100+ GB entries got relabeled to POST-SHOOT.

### Fix Part 1: Data Recovery for Shakti Neupane

I will reverse the rotation using the database. The `final_generated_path` on each file row proves which event each file truly belongs to (the path still says the original event name).

**Crew assignments** — reverse the rotation:
- Swap crew fields between the 4 assignment rows to restore original assignments
- POST-SHOOT (new, Chaitra 30) should have empty crew
- BRIDE MEHNDI, WEDDING, PRE+RECEPTION get their original crew back

**File rows** — restore event_name from `final_generated_path`:
- Files whose path contains `BRIDE MEHNDI` → set `event_name = 'BRIDE MEHNDI & GROOM HALDI'`
- Files whose path contains `WEDDING BOTH SIDES` → set `event_name = 'WEDDING BOTH SIDES'`
- Files whose path contains `PRE+RECEPTION` → set `event_name = 'PRE+RECEPTION'`
- Empty skeleton POST-SHOOT rows → delete (POST-SHOOT hasn't happened)
- Duplicate skeleton rows → delete

### Fix Part 2: Rewrite `ensureFreelancerAssignmentRows` — Name-Based Matching

Replace the broken positional logic with **name-based matching**:

```text
For each new event:
  1. Find existing row where event name matches → UPDATE date fields only (crew stays)
  2. No match found → INSERT new skeleton row

For each existing row with no match in new list:
  → DELETE + cascade to files/video/settings
```

This is fundamentally safer because:
- Adding a new event NEVER touches other events' crew or files
- Removing an event only deletes that specific event's data
- Renaming requires the user to explicitly change the name in the event editor (handled separately)

### Files changed
1. `src/lib/freelancer-assignment-cache.ts` — rewrite `ensureFreelancerAssignmentRows` with name-based matching
2. Database updates — restore Shakti's crew assignments and file event names

### Safety guarantee
- Only Shakti Neupane's rows are touched in data recovery
- File `final_generated_path` values are NOT modified (those are the physical backup paths)
- Only `event_name`, `event_date_ad`, `event_month`, `event_day`, `event_year` are corrected on file rows
- The code fix prevents this from ever happening again to any client

