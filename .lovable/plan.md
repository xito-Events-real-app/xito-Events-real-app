

## Clear All File Management Data (Keep Storage Devices)

### What will happen
- Delete all 199 rows from the `files_management` table
- Storage devices (hard drives, SSDs, PCs) will NOT be touched
- When you next visit a month in the Files section, `ensureFileRowsForMonth` will auto-regenerate fresh rows from your freelancer assignments with the corrected month names (e.g., "FALGUN EVENTS 2082")

### How
Run a single database operation:
```sql
DELETE FROM public.files_management;
```

This gives you a clean slate — all file rows will be regenerated automatically with the fixed card labels ("1", "2") and correct year event folder names when you select a month.

