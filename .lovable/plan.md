

## Plan: Fix sheet sync row matching by using DB `id` as primary key

### Root Cause
The sheet sync uses a **composite key** (5 fields concatenated) to match DB rows to sheet rows. If any of those fields in the sheet are slightly different (empty, trimmed, or shifted), the wrong row gets updated — which is why PG SAFAL's backup history appears on EP BHAGWAN's sheet row.

### Fix: Add `id` column to sheet and use it for matching

**File: `supabase/functions/google-sheets/index.ts`** (pushFilesToSheetAction)

1. **Add `ID` as the first column** (Column A) in the header row, shifting all other columns right by one (A→Y, 25 columns total)
2. **Update `HEADER_ROW`**: Prepend `'ID'` to the array
3. **Update `mapRow`**: Prepend `f.id` to the row array
4. **Update `makeKey`**: Simply use `row[0]` (the `id` column) instead of the composite key — this guarantees exact matching
5. **Update all range references**: Change `A:X` → `A:Y` (25 columns) across header write, read, update, and append operations

### Why this is better
- The DB `id` is a UUID that uniquely identifies each file record — no collisions possible
- Even if freelancer names, types, or card labels change, the row will always match correctly
- Backup history, confirmations, and all other data will always go to the correct sheet row

### Deployment
- Redeploy the `google-sheets` edge function
- On next sync, existing sheet rows without the ID column won't match, so they'll be re-appended with IDs. The user may need to clear old rows from the sheet once.

