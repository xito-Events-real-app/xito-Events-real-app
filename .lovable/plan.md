

## Enhance Event Sections in Client File Detail Page

### Changes to `src/pages/FileClientDetail.tsx`

**1. Event header — add per-event stats**

In each event header bar, after the date badge and file count, add:
- `📷 X.X GB (DeviceName)` — total photo size + device name from `backup_1_device_name`
- `🎬 X.X GB (DeviceName)` — total video size + device name
- `Remaining: N` — count of files without `final_generated_path`

Compute these from the group's files using the same PHOTO/VIDEO role sets.

**2. Sort files: photos first, then videos, grouped by name**

Sort each group's files array:
1. Photo roles first (PB, PG, EP), then video roles (VB, VG, EV, DRONE, FPV, IPHONE)
2. Within each category, sort by `freelancer_name` so same names are sequential

**3. Different row background for photo vs video**

- Photo rows: `bg-purple-500/5` (subtle purple tint)
- Video rows: `bg-amber-500/5` (subtle amber tint)
- Applied to the `TableRow` className

### Technical detail

For device name in brackets, extract the unique `backup_1_device_name` values per category (photo/video) within each event group. If multiple devices, show comma-separated.

### Files changed
1. `src/pages/FileClientDetail.tsx` — event header stats, sort order, row backgrounds

