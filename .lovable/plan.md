

# Fix Star Client Eligibility: Switch to Blocklist

## Change

**File: `src/hooks/useHandlerStarClients.ts`**

Replace the current allowlist approach with a blocklist. Only these 6 statuses should auto-reset priority to 0:

- BOOKED
- CANCELLED BY CLIENT
- POSTPONED
- CANCELLED BY US
- BOOKED SOMEWHERE ELSE
- LOST

All other statuses (including `CALLED : QUOTATION PENDING`, `FOLLOW UP`, `NUMBER PROVIDED`, etc.) will retain their star rating.

### Before (allowlist)
```typescript
const STAR_ELIGIBLE_STATUSES = [
  'JUST ENQUIRED', 'FOLLOW UP', 'QUOTATION SENT', 'BARGAINING IS ON', 'ADVANCE PENDING',
];
// reset if NOT in list
```

### After (blocklist)
```typescript
const STAR_INELIGIBLE_STATUSES = [
  'BOOKED', 'CANCELLED BY CLIENT', 'POSTPONED', 'CANCELLED BY US', 'BOOKED SOMEWHERE ELSE', 'LOST',
];
// reset only if IN this list
```

The `useMemo` filter for displaying star clients also needs the same inversion — show clients with priority > 0 whose status is NOT in the ineligible list.

**Note:** The `BOOKED SOMEWHERE ELSE` check must come before `BOOKED` since `.includes('BOOKED')` would match both. We'll use exact ordering or check `BOOKED SOMEWHERE ELSE` first.

## Files
1. `src/hooks/useHandlerStarClients.ts` — Replace allowlist with blocklist (both in useEffect reset and useMemo filter)

