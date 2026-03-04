

## Changes to `supabase/functions/google-sheets/index.ts` — `pushFilesToSheetAction`

### Problem
1. Columns R (DOUBLE BACKUP) and S (TRIPLE BACKUP) currently output `TRUE`/`FALSE` booleans. They should output the actual backup path values instead.
2. There's no NOTES column in the sheet.

### Fix

**1. Add NOTES column to header (line 7663-7670)**

Update `HEADER_ROW` to add `'NOTES'` at the end — making it 23 columns (A:W):
```
'RE-CONFIRMATION', 'DOUBLE BACKUP PATH', 'TRIPLE BACKUP PATH', 'DRIVE UPLOAD',
'DRIVE LINK', 'DELETED OR NOT', 'NOTES',
```

**2. Update `mapRow` to output paths instead of booleans, and add notes (lines 7690-7695)**

```
f.reconfirmation ? 'TRUE' : 'FALSE',
f.backup_2_path || '',          // was: f.double_backup ? 'TRUE' : 'FALSE'
f.backup_3_path || '',          // was: f.triple_backup ? 'TRUE' : 'FALSE'
f.drive_upload ? 'TRUE' : 'FALSE',
f.drive_link || '',
f.deleted_or_not ? 'TRUE' : 'FALSE',
f.notes || '',
```

**3. Update all range references from `V` to `W`** (23 columns):
- Line 7723: header range `A1:V1` → `A1:W1`
- Line 7734: read range `A:V` → `A:W`
- Line 7791: update range `A${row}:V${row}` → `A${row}:W${row}`
- Line 7822: append range `A:V` → `A:W`

**4. Force re-sync** — Since the header changed, all existing rows with backups should be re-pushed. The bootstrap logic handles this automatically if the sheet is cleared, but we should also reset `synced_to_sheet` for all rows so the new columns get populated. This will happen naturally on next push since the column mapping changed — but to be safe, we can suggest the user triggers a manual re-sync after deployment.

