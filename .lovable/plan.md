

# Remove Star Clients Limit

## Problem
The star clients section on the desktop Suite landing page is capped at 10 clients per handler due to a `.slice(0, 10)` in the hook. Handlers with more than 10 star clients are missing entries.

## Solution
Remove the `.slice(0, 10)` call in `src/hooks/useHandlerStarClients.ts` (line 25) so all matching star clients are returned and displayed.

## Technical Details

**File: `src/hooks/useHandlerStarClients.ts`**

Remove line 25 (`.slice(0, 10)`) from the chain. The filtered and sorted array will be returned in full.

Before:
```
.sort(...)
.slice(0, 10); // Limit to top 10
```

After:
```
.sort(...);
```

One line change, no other files affected.

