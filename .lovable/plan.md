

## Fix Unassigned Benzo Keep Notes Fetch + Add Star Feature and Proper View

### Problem Found

The edge function reads from `'CLIENT TRACKER'!AM2` and returns an empty array. The API call works (returns `{ data: [], success: true }`) but the cell appears empty. This is likely because:
- The notes may have been saved to a different cell (row mismatch) or the column shifted
- The cell content may have been cleared or overwritten during a sheet operation

### Fix: Add Logging + Resilient Fetch

**1. Edge Function (`supabase/functions/google-sheets/index.ts`)**

- Add console logging to `getUnassignedBenzoKeepNotes` to show what raw data is returned from the sheet cell, so we can debug whether the cell is truly empty or the JSON is malformed
- Also try reading a wider range (`AM2:AM3`) in case notes ended up in a different row
- Add the `isStarred` field to the `UnassignedBenzoNote` interface

**2. Frontend Interface Updates**

Add `isStarred: boolean` to:
- `UnassignedBenzoNote` interface in `supabase/functions/google-sheets/index.ts` (line 264)
- `UnassignedBenzoNote` interface in `src/lib/sheets-api.ts` (line 774)
- `UnassignedBenzoNote` interface in `src/hooks/useUnassignedBenzoKeepNotes.ts` (line 11)

### New Features

**3. Star Notes (`src/components/suite/UnassignedBenzoKeepDialog.tsx`)**

- Add a star icon button (Star from lucide-react) on each note card, next to the edit/delete buttons
- Clicking toggles `isStarred` on the note and saves it back via `saveNote`
- Starred notes show a filled yellow star icon
- Sort order: starred notes first, then by `lastUpdated` descending (recent to old)

**4. Proper Date-Sorted View Tab**

- Replace the current flat list with a Tabs component having two tabs:
  - **All Notes** - shows all notes sorted by date (recent to old), starred first
  - **Starred** - shows only starred notes, sorted by date
- Each note card shows the creation date prominently
- The existing note card layout (colored background, actions, Xito Search) stays the same

**5. Sorting Logic in Hook (`src/hooks/useUnassignedBenzoKeepNotes.ts`)**

- Update the sort in `fetchNotes` to sort starred first, then by `lastUpdated` descending
- Add a `toggleStar` function that flips `isStarred` and saves

### Files to Change

| File | Change |
|------|--------|
| `supabase/functions/google-sheets/index.ts` | Add logging to fetch, add `isStarred` to interface |
| `src/lib/sheets-api.ts` | Add `isStarred` to `UnassignedBenzoNote` interface |
| `src/hooks/useUnassignedBenzoKeepNotes.ts` | Add `isStarred`, update sort logic, add `toggleStar` |
| `src/components/suite/UnassignedBenzoKeepDialog.tsx` | Add star button, tabs for All/Starred, date-sorted view |

