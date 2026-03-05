

## Plan: Typography & Contrast Overhaul for Client Files Table

### Problem
Text is too small, uses gray-on-gray (`text-muted-foreground` on dark backgrounds), and lacks visual hierarchy. The "SET PATH" button is hard to see.

### Changes to `src/components/client-detail/ClientFilesSection.tsx`

**1. Table Headers (lines 243-258)**
- Change from `text-muted-foreground` to `text-slate-300` (bright) 
- Add `uppercase tracking-wider text-xs` to each `<th>`
- Keep `font-bold`

**2. Table Body Rows (lines 261-346)**
- Row class: increase base to `text-sm` (from `text-xs`)
- Name cell (line 269): `text-white font-bold text-sm`
- Secondary data (Side, Card, Format, Size, Who Copied): change `text-muted-foreground` → `text-slate-200 font-semibold`
- Role badge: increase to `text-xs` with `font-bold`
- Row padding: `py-1.5` → `py-3` on all `<td>` cells

**3. Tags & Chips — BackupPill (line 55)**
- Increase padding: `px-1.5 py-0.5` → `px-3 py-1`
- Text: ensure `text-slate-900 font-bold` on light bg, keep dark mode colors
- Increase size to `text-xs`

**4. SET PATH Button (line 336)**
- Change to `text-sm font-bold tracking-wide` with larger height `h-7 px-3`

**5. Row Spacing**
- All `<td>` cells: `py-1.5` → `py-3`

### Scope
- Only `ClientFilesSection.tsx` — no data/layout/theme changes
- Section headers (PHOTOS/VIDEOS) kept as-is

