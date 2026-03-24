

## Add Size Field to Potential Delete + Storage Summary Stats

### Database Migration
Add `size_gb` column to `potential_deletes`:
```sql
ALTER TABLE potential_deletes ADD COLUMN size_gb numeric DEFAULT 0 NOT NULL;
```

### Changes

**1. DB Migration** — Add `size_gb` numeric column (default 0)

**2. `src/hooks/usePotentialDeletes.ts`**
- Add `size_gb: number` to `PotentialDelete` interface
- Include `size_gb` in the `add()` method metadata parameter

**3. `src/pages/PotentialDelete.tsx`**

**Upload dialog**: Add a "Size (GB)" number input field between the Client Name and Responsibility sections. Optional field, defaults to 0.

**Card display**: Show size on each card as a badge (e.g., `📦 128 GB`) next to device and responsibility badges. Auto-converts to TB if >= 1024 GB.

**Top stats summary** — Replace/enhance the stats bar with a new storage summary row showing:
- **Total Size (Active)**: Sum of `size_gb` across all active records (not deleted)
- **Ready to Delete**: Sum of `size_gb` for records with `delete_approval === "YES"` — this is the "possible pending deletion" size
- **Permanently Deleted**: Sum of `size_gb` for records with `permanently_deleted_at` set — this is "what has been deleted till now"
- All values auto-format GB/TB using the existing pattern (>= 1024 GB → TB)

### Stats Row Layout
```text
┌─────────────┬──────────────────┬──────────────────┐
│ 📦 TOTAL    │ 🟢 CAN DELETE    │ 🗑 DELETED       │
│ 1.24 TB     │ 640 GB           │ 380 GB           │
│ 45 files    │ 12 files         │ 8 files          │
└─────────────┴──────────────────┴──────────────────┘
```

### Files changed
1. DB migration — add `size_gb` column
2. `src/hooks/usePotentialDeletes.ts` — add `size_gb` to interface and `add()` method
3. `src/pages/PotentialDelete.tsx` — size input in upload dialog, size badge on cards, storage summary stats row

