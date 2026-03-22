

## Fix Client File Detail Page — Read-Only View with Proper Colors

### Problems
1. Black text on dark background — unreadable
2. Editable inputs where user just wants to see data
3. Action buttons cluttering the view — user wants read-only
4. "Set Path" should redirect to the Files page (FullScreenFilesTable) instead of opening dialog here

### Changes — `src/pages/FileClientDetail.tsx`

**1. Remove all editable elements**
- Remove `Input` fields for Size, Items — replace with plain text
- Remove `Set Path` and `CONFIRM` buttons
- Remove `FilePathBuilderDialog` and `ReconfirmationDialog` imports and state
- Remove `handleUpdate`, `handleConfirm`, `openPathDialog`, `openConfirmDialog`
- Keep only the `fetchData` logic for loading

**2. "Set Path" becomes a navigation link**
- If file has no path: show "Set Path →" as a link that navigates to `/files?section=files` (the FullScreenFilesTable)
- If file has a path: show the path as plain text

**3. Fix color theory for dark theme**
- Primary text: `text-white` (freelancer names, values)
- Secondary text: `text-slate-300` (labels like "Format", "Size")
- Muted text: `text-slate-400` (sub-info, timestamps)
- Accent colors remain: green for copied, red for pending, yellow for single backup
- Card backgrounds: `bg-slate-900` with `border-slate-700`
- Header: `bg-slate-950`
- Remove all raw `hsl()` inline values — use Tailwind's slate palette for consistency and readability

**4. Keep the same card-based layout structure**
- Summary cards at top (same 4 cards)
- Event sections with freelancer cards in 2-col grid
- Same grouping logic — no structural changes

### Single file changed
- `src/pages/FileClientDetail.tsx`

