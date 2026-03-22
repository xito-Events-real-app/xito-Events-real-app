

## Fix: Shakti Neupane — Remove `**` Date Events from File Management

### Problem 1: POST SHOOT rows should not exist
POST SHOOT has `event_date_ad: 2026-03-**` — the `**` means the date is not yet decided, so the event has NOT happened. File rows should never be generated for undated events. Currently there are **13 active POST SHOOT rows**, many with wrong crew data (crew from BRIDE MEHNDI leaked into POST SHOOT rows).

### Problem 2: FileClientDetail page shows `**` events
The page at `/files/client/:clientId` loads ALL file rows for a client without filtering out `**` dates, so POST SHOOT appears even though it should not.

### Problem 3: `syncFilesWithAssignments` creates rows for `**` events
When crew is assigned to any event, `syncFilesWithAssignments` is called — it does NOT check if `event_date_ad` contains `**`, so it generates file rows for undated events.

---

### Fix 1: Data cleanup (via database)
- Soft-delete all 13 active POST SHOOT rows for Shakti (`event_date_ad = '2026-03-**'`)
- These rows have no meaningful file data (all `final_generated_path` are empty, `size_gb = 0`)

### Fix 2: `src/pages/FileClientDetail.tsx`
- In `fetchData()`, add filter: exclude rows where `event_date_ad` contains `**`
- This prevents undated events from ever appearing in the client file detail view

### Fix 3: `src/lib/files-api.ts` — `syncFilesWithAssignments()`
- At the top of the function, after loading the assignment, check if `event_date_ad` contains `**`
- If yes, return early — never create file rows for undated events
- This prevents the root cause: crew changes on other events triggering row creation for `**` events

### Files changed
1. `src/pages/FileClientDetail.tsx` — filter out `**` date rows
2. `src/lib/files-api.ts` — early return in `syncFilesWithAssignments` for `**` dates
3. Data: soft-delete 13 corrupted POST SHOOT rows

