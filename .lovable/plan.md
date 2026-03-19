

## Fix: Cascade Freelancer Changes to File Management (and Future-Proof the Chain)

### Problem
When you remove a freelancer (e.g., RAMESH) from KARISHMA SHRESTHA's Chaitra 5 assignment, the `freelancer_assignments` table updates correctly, but the `files_management` table still has RAMESH's old file row. The file system only **adds** new rows — it never removes or updates rows when freelancers change.

### Root Cause
`updateFreelancerAssignment()` in `freelancer-assignment-api.ts` writes to the assignment table and syncs to Google Sheets, but has **zero awareness** of the `files_management` table. The `ensureFileRowsForMonth()` function only inserts missing rows — it never removes stale ones where the freelancer no longer matches the assignment.

### The Cascade Chain You Want
```text
BOOKED → Freelancer Assigned → Files → Video Edit Tracker
         ↓ (change here)
         ↓ cascades to ↓
         Files updated/removed
         Video edit rows cleaned
```

### Fix (3 parts)

#### 1. Add `syncFilesWithAssignments()` function
**File: `src/lib/files-api.ts`**

New function that, given a `registeredDateTimeAD` and `eventName`, reads the current freelancer assignments and reconciles the `files_management` table:
- **Remove**: Soft-delete (`deleted_or_not: true`) any file row where the freelancer no longer exists in the assignment (only if the file has NO backup data — `final_generated_path` is empty)
- **Add**: Insert skeleton rows for any newly assigned freelancer not yet in files
- **Rename**: If a freelancer name changed for the same role, update the file row's `freelancer_name` in-place (preserving backup data)

This protects files that already have backups from being deleted — those get flagged instead.

#### 2. Call `syncFilesWithAssignments()` after every assignment update
**File: `src/lib/freelancer-assignment-api.ts`** — inside `updateFreelancerAssignment()`

After the Supabase cache write (line 88), call `syncFilesWithAssignments()` for the affected event. This makes the cascade automatic and instant.

#### 3. Add cleanup pass to `ensureFileRowsForMonth()`
**File: `src/lib/files-api.ts`** — inside `_ensureFileRowsForMonthInner()`

After inserting new rows (the existing logic), add a cleanup pass: for each assignment in the month, check if any file rows reference a freelancer that's no longer in the assignment, and soft-delete the empty ones.

### Safety Rules
- File rows with backup data (`final_generated_path` not empty, or `size_gb > 0`) are **never deleted** — they're flagged/preserved
- Only skeleton rows (no path, no size, no backups) get soft-deleted
- All deletions use `deleted_or_not: true` (soft delete), not hard delete

### Files Changed
- `src/lib/files-api.ts` — New `syncFilesWithAssignments()` + cleanup in `ensureFileRowsForMonth`
- `src/lib/freelancer-assignment-api.ts` — Call cascade after assignment update
- `src/components/suite/AllClientsCrewTable.tsx` — Call cascade after inline assignment changes

