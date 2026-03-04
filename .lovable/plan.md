

## Fix Column Spacing in File Rows Table

The issue is that the **Name** column has no width constraint (`<th>` without a `w-*` class), so it stretches to fill remaining space, pushing other columns into cramped widths.

### Changes in `src/components/files/FullScreenFilesTable.tsx`

1. **Constrain Name column** — add `w-16` (or similar small width) since it only shows first names
2. **Constrain Side column** — reduce from `w-14` to `w-12`
3. **Widen backup columns** — increase 1st/2nd/3rd from `w-16` to `w-20` so device names are readable
4. **Widen Format** — from `w-16` to `w-20`
5. **Widen Copied** — from `w-16` to `w-20`
6. **Widen Link** — from `w-16` to `w-18`
7. **Add `whitespace-nowrap`** to all header cells to prevent wrapping

This is a single-file change adjusting the `<th>` width classes in the `renderSection` function (lines 246-261) and corresponding `<td>` cells.

