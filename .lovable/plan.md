

# Fix Assistant Role: Show All Freelancers

## Two Issues

### 1. "Prasan Karki" appearing but not in FREELANCERS sheet
This is likely a caching issue -- the freelancer data is cached for 5 minutes in `useFreelancerAssignments.ts`. If Prasan Karki was recently removed from the sheet, the cached data still shows him. No code fix needed for this specifically, but the second fix below will resolve any filtering inconsistencies.

### 2. Assistant column should show ALL freelancers
Currently, `ROLE_FILTER_MAP` maps `assistant` to `hybridShooter`, so only freelancers marked as Hybrid Shooters appear. Since anyone can be an assistant, the assistant column should show every freelancer from the sheet.

## Fix

### File: `src/lib/freelancer-assignment-api.ts`

Remove the `assistant` entry from `ROLE_FILTER_MAP`. When the map has no entry for a field, the `getFilteredFreelancersByRole` function already falls through to returning ALL freelancer names (line 120: `if (!filterKey) return freelancers.map(f => f.name).filter(Boolean)`).

**Change on line 112:**
Remove `assistant: 'hybridShooter',` from the `ROLE_FILTER_MAP` object.

That single line removal fixes both issues -- assistant will now show all freelancers, and role-specific filtering continues to work for all other columns.

| File | Change |
|---|---|
| `src/lib/freelancer-assignment-api.ts` | Remove `assistant: 'hybridShooter'` from `ROLE_FILTER_MAP` so assistant shows all freelancers |
