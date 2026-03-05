

## Plan: Full Color Theory Overhaul for Client Files Table

### Background Analysis
- Dark theme background: `hsl(220 25% 8%)`, muted: `hsl(220 20% 18%)`, muted-foreground: `hsl(220 15% 65%)` — this is the gray-on-gray problem
- The `text-muted-foreground` is only 65% lightness on an 18% lightness bg — too low contrast
- `text-slate-300` is still washed out on this navy-tinted dark bg

### Color Theory Solution — Warm Amber + Cyan accent on cold dark navy

**Headers** → `text-cyan-400 font-bold text-sm` (cyan pops on navy, already used in event circles)
**Primary data (names)** → `text-white font-black text-base`
**Secondary data** → `text-amber-200 font-bold text-sm` (warm yellow-gold on cold dark = maximum pop)
**Role badges (PB/VB)** → `text-sm font-black px-3 py-1` with colored bg (emerald for photo, indigo for video)
**X marks** → `w-5 h-5 text-red-400`
**Confirmed** → `text-sm font-black` with bg pill styling
**SET PATH** → `bg-cyan-600 text-white font-bold text-sm h-8 px-4`
**Pre-expand summary** → `text-xs text-amber-200/80 font-bold`
**Event dates/remaining** → `text-xs font-bold` with proper colors
**Edit pen icons** → `w-4 h-4`
**Notes icon** → `w-5 h-5`

### All changes in `src/components/client-detail/ClientFilesSection.tsx`

**1. BackupPill X mark (line 42)**
- `w-4 h-4 text-destructive` → `w-5 h-5 text-red-400`

**2. Table headers (lines 243-258)**
- `text-slate-300` on `<tr>` → remove from tr
- Each `<th>`: `font-semibold text-xs` → `font-bold text-sm text-cyan-400 uppercase tracking-wider`

**3. Role badge (line 264)**
- `text-xs px-2 py-0.5 font-bold` → `text-sm px-3 py-1 font-black`
- Add conditional bg: photo roles → `bg-emerald-800 text-emerald-200 border-emerald-600`, video → `bg-indigo-800 text-indigo-200 border-indigo-600`

**4. Name (line 269)**
- `font-bold text-sm text-white` → `font-black text-base text-white`

**5. Side/Card/Format/Size/WhoCopied (lines 274-279, 323)**
- `text-sm text-slate-200 font-semibold` → `text-sm text-amber-200 font-bold`

**6. Cloud X mark (line 317)**
- `w-4 h-4 text-destructive` → `w-5 h-5 text-red-400`

**7. Confirmed/Not Confirmed (lines 328-330)**
- `text-xs font-black` → `text-sm font-black px-3 py-1 rounded-full`
- CONFIRMED: add `bg-emerald-900/60`
- NOT CONFIRMED: add `bg-red-900/60`

**8. SET PATH button (line 336)**
- `h-7 text-sm px-3 font-bold tracking-wide` + variant outline → `h-8 text-sm px-4 font-bold tracking-wide bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500`

**9. Edit pen icons (lines 285, 294, 303)**
- `w-3 h-3` → `w-4 h-4`

**10. Notes icon (line 343)**
- `w-3.5 h-3.5` → `w-5 h-5`

**11. Pre-expand summary (lines 439-455)**
- `text-[11px] text-muted-foreground` → `text-xs text-amber-200/80 font-bold`
- Names inside: add `text-white`

**12. Event date (line 427)**
- `text-[11px] text-muted-foreground` → `text-xs text-amber-200/70 font-bold`

**13. Remaining/All Copied (lines 430, 432)**
- `text-[11px]` → `text-xs`

**14. Cloud pill text (line 311)**
- `text-[11px]` → `text-xs`

### Scope
- Only `ClientFilesSection.tsx` — no theme/data/layout changes

