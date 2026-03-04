
Goal: fix the file table spacing so columns are balanced, with clearly larger spacing for Drive → Link → Copied.

What is causing the issue:
1) `w-18` is not a default Tailwind width utility, so Link width is effectively not applied.
2) Width is only defined on `<th>`, while body `<td>` content can still force uneven expansion.
3) `table w-full` auto layout redistributes space based on content, so “Name/Side” and backup columns can still crowd others.

Implementation plan (single file: `src/components/files/FullScreenFilesTable.tsx`):

1) Switch to deterministic table sizing
- Change table to `table-fixed w-full`.
- Add a `<colgroup>` with explicit column widths so header/body always follow the same sizing.

2) Rebalance column widths (compact left, larger right)
- Reduce early columns:
  - Role: small
  - Name: compact fixed width
  - Side/Card: compact
- Keep Format/Backup readable.
- Increase these specifically:
  - Drive: wider than now
  - Link: wider than Drive
  - Copied: widest among the 3
- Replace invalid `w-18` with valid class (e.g. `w-[4.5rem]`) or col width equivalent.

3) Ensure visual spacing between Drive, Link, Copied
- Add subtle vertical separators (`border-l`) at Link and Copied columns.
- Keep `whitespace-nowrap` for these headers/cells so labels don’t wrap and collapse.

4) Keep readability consistent
- Apply matching alignment and width behavior to both header and row cells.
- Slightly increase right-side cell padding for Drive/Link/Copied to improve “air” without bloating whole table.

5) Validation after change
- Expand a client row in Files view and confirm:
  - No large empty gap after Name/Side.
  - Drive, Link, Copied are clearly separated and readable.
  - No header wrapping or row jitter when data changes.

Result you should see:
- Compact left identity columns (Role/Name/Side),
- More room for operational columns,
- Noticeably better spacing between Drive, Link, and Copied,
- Overall balanced table proportions.
