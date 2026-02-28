
Goal: fix header stats so each role counts only required assignment slots, and adjust header layout to show:
- top-left: remaining
- center: role code (PB/VB/...)
- bottom-right: assigned/total

What I found
- Current header stats in `src/components/suite/AllClientsCrewTable.tsx` (around lines 530+) use:
  - `total = filteredRows.length`
  - `assigned = rows with non-empty column value`
- This ignores per-row `requiredCategories`, so roles are counted even when that role is not required on many rows.
- The table already has required-role logic elsewhere:
  - `isRequired = reqCodes.length === 0 || reqCodes.includes(col.short)` for row rendering.
- Backend data for 2082 month 11 confirms your case:
  - total rows: 44
  - rows requiring PB: 29
  - rows assigned PB: 29
  - expected header: `0 PB 29/29`

Implementation plan

1) Update per-column stats logic to count required slots only
- File: `src/components/suite/AllClientsCrewTable.tsx`
- Replace `columnStats` computation with required-aware counting:
  - For each crew column:
    - `total` = number of `filteredRows` where this role is required for that row
    - `assigned` = number of required rows where the cell has a non-empty value
    - `remaining` = `Math.max(0, total - assigned)`
- Required check per row/column will follow existing convention:
  - parse `row.requiredCategories` into codes
  - role required if `reqCodes.length === 0 || reqCodes.includes(col.short)`
- Result for your example becomes `0 / PB / 29/29` instead of `15 / PB / 29/44`.

2) Change header box layout to 3-position placement
- In desktop `<th>` header rendering for crew columns (around lines 1018+), replace inline one-line flex with a positioned mini-box:
  - container: `relative` with fixed height (enough room for corner labels), centered content
  - remaining (`s.remaining`): absolute top-left, bold/prominent
  - role short (`col.short`): centered
  - assigned/total (`s.assigned/s.total`): absolute bottom-right, small muted text
- Keep existing color group backgrounds and dynamic widths.
- Ensure no wrapping and good alignment on narrow columns (`Drone`, `FPV`) by slightly tuning font sizes/offsets if needed.

3) Keep existing row/cell behavior unchanged
- No change to assignment editing, required-category popover, or lock-empty-slots flow.
- No backend schema/function changes needed.

Technical notes
- I will likely introduce a tiny local helper inside the component for consistency:
  - `getRequiredCodes(row)` and/or `isRoleRequired(row, shortCode)`
- `columnStats` dependencies remain `[filteredRows]`.
- Defensive formatting:
  - if `total === 0`, show `0` and `0/0` cleanly.
  - clamp `remaining` at zero in case of legacy data anomalies.

Validation checklist after implementation
1) Reproduce your Falgun view and confirm PB header shows:
   - top-left: `0`
   - center: `PB`
   - bottom-right: `29/29`
2) Check a role with partial fill (e.g. `12/29`) to ensure:
   - top-left equals `17`
3) Change required crew on one row via the role selector and verify header stats update immediately.
4) Run through desktop and mobile breakpoints to ensure header stays readable (desktop is primary for this header layout).
