

## Plan: Tweaks to Client Files Section

### Changes to `src/components/client-detail/ClientFilesSection.tsx`

**1. Event Header — centered layout with new format (lines 421-435)**
Restructure the collapsed event header to display as a single centered line:
`MAGH 17 - WEDDING - 2 FILES COPIED - 1 REMAINING     TOTAL: 3 FILES`
- Use `text-base font-black text-white` for the entire line
- Center-align the content with `justify-center`
- Remove the small circle with day number; integrate the day into the text
- Use the BS month (`eventMonth`) + day + event name + computed copied/remaining counts

**2. Table Headers — white background strip (lines 243-258)**
- Change the `<tr>` to have `bg-white dark:bg-white/10` background
- Change header text from `text-cyan-400` to `text-slate-900 dark:text-white` so they read clearly on the white bg
- Keep `font-bold text-sm uppercase tracking-wider`

**3. NOT CONFIRMED — single line (line 330)**
- Add `whitespace-nowrap` to the NOT CONFIRMED span so it never wraps

**4. Card label — uppercase (line 277)**
- Change `Card {n}` to `CARD {n}` (uppercase string)

**5. Notes pen icon — white bg + shadow (line 342-343)**
- Wrap the PenLine icon in a styled container: `bg-white dark:bg-white/20 rounded-md shadow-md p-1`
- Keep the existing color logic (primary if has notes, muted-foreground if not)

