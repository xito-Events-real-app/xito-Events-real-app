

## Add "LOST" Category to Fresh Clients

### What It Does

A new automatic "LOST" category will appear at the end of the status swipe pages. It captures clients who are still in early pipeline stages (JUST ENQUIRED through ADVANCE PENDING) but have at least one event date that has already passed -- meaning they were likely forgotten and the opportunity is gone.

### Logic

A client is considered "LOST" when:
- Their current status is one of: JUST ENQUIRED, NUMBER PROVIDED, TEXTED : NOT CALLED, CALL NOT RECEIVED, CALLED : QUOTATION PENDING, QUOTATION SENT : REVIEW PENDING, BARGAINING IS ON, or ADVANCE PENDING
- At least one of their event dates (Year/Month/Day from Columns M/N/O) has passed compared to today's Nepali date
- Dates with unknown day ("**") are skipped (not counted as past)

Clients in BOOKED, POSTPONED, CANCELLED, or BOOKED SOMEWHERE ELSE are never classified as LOST.

### Technical Changes

**File: `src/pages/FreshClients.tsx`**

1. Import `isBSDatePast` from `@/lib/nepali-date.ts`

2. Update the `clientsByStatus` grouping logic (lines 66-81):
   - Before assigning a client to their normal status group, check if they qualify as "LOST"
   - If their normalized status is between JUST ENQUIRED and ADVANCE PENDING, parse `eventYear`, `eventMonth`, `eventDay` (split by newline) and check each date with `isBSDatePast()`
   - If at least one known date has passed, place them in a "LOST" group instead of their normal status group

3. Update `activeStatuses` ordering (lines 84-113):
   - Add "LOST" as the last category in the ordered list (after all standard statuses)

4. Update `getStatusColor` (lines 132-146):
   - Add a color for LOST: `bg-rose-700 text-white` (a dark red to signal urgency/loss)

**No other files need to change.** The existing `FreshClientCard` component will render these clients normally within the LOST category page.

### Example

```
RAMESH PATHAK
  Status: JUST ENQUIRED
  Events: Magh 21, Magh 22, Magh 29
  Today: Falgun 5

  --> Magh 21, 22, 29 are ALL past --> Goes to LOST
```

### Files Summary

| File | Change |
|------|--------|
| `src/pages/FreshClients.tsx` | Add LOST grouping logic, color, and category ordering |

