
## Add "ALMOST LOST" and "COLD DATES" Categories

### What Changes

Two new special categories will be added to the **Fresh Clients** page (both mobile and desktop), separated from the regular status categories by a horizontal divider. Additionally, two quick-access buttons will be added to the **Suite Landing Home** tab that open full-screen popups showing these clients.

### Category Definitions

**ALMOST LOST** (Orange/Amber theme)
- Clients with status from JUST ENQUIRED to ADVANCE PENDING
- Their **earliest** event date is **less than 1 month** (30 days) from today
- Their event dates have NOT yet passed (otherwise they'd be in LOST)
- Status does NOT change -- this is a read-only alert section
- Header note: "Clients with events in less than 1 month"

**COLD DATES** (Cyan theme)
- Same logic as existing Cold Dates in Client Tracker dashboard
- Dates that have enquiries (JUST ENQUIRED to ADVANCE PENDING) but ZERO bookings
- Displayed as a flat list of client cards grouped under this category (not the date-card format from dashboard)

### Layout in Fresh Clients

```text
[JUST ENQUIRED] [NUMBER PROVIDED] ... [BOOKED SOMEWHERE ELSE]
──────────────── horizontal separator ────────────────
[ALMOST LOST] [COLD DATES] [LOST]
```

The three special categories (ALMOST LOST, COLD DATES, LOST) appear after a visual separator at the end of the swipe pages.

### Layout in Suite Landing (Mobile Home Tab)

Two clickable cards placed between the Events/Handler tabs and the Search/Sync buttons:

```text
[Quick Actions]
[Events/Handler Tabs]
[Almost Lost (count)] [Cold Dates (count)]   <-- NEW
[Search] [Sync]
[Benzo Keep]
```

Tapping either card opens a full-screen Dialog showing the respective client list using FreshClientCard components.

### Technical Details

**1. src/pages/FreshClients.tsx**

- Add `getFirstEventDaysFromNow(client)` utility:
  - Parse all event dates (Year/Month/Day split by newline)
  - Convert each to AD using `bsToAD()`, skip unknown dates
  - Find the earliest future date
  - Return days until that date (or null if no valid future dates)
- In `clientsByStatus` grouping memo:
  - After checking LOST, check if client qualifies as ALMOST LOST: early pipeline status + first event within 30 days + not past
  - Remaining early-pipeline clients whose dates are in cold dates get grouped under COLD DATES
- For COLD DATES: compute cold dates the same way as Dashboard (dates with enquiries but zero bookings), then collect the unique clients from those dates
- Update `activeStatuses` ordering: regular statuses first, then a separator marker, then ALMOST LOST, COLD DATES, LOST
- Add colors: ALMOST LOST = `bg-amber-600 text-white`, COLD DATES = `bg-cyan-600 text-white`
- Add a visual horizontal line in the dot navigation area before the special categories
- When ALMOST LOST header is shown, display subtitle: "Events in less than 1 month"

**2. src/components/desktop/DesktopFreshClients.tsx**

- Add ALMOST LOST and COLD DATES to `getStatusConfig` with appropriate icons and colors
- Add these categories to the status filter dropdown

**3. src/components/suite/MobileSuiteLanding.tsx (HomeTabContent)**

- Import `useCachedData` to access client data
- Compute ALMOST LOST and COLD DATES client counts using the same logic
- Add two styled cards (amber for Almost Lost, cyan for Cold Dates) with counts
- Place them between `EventsHandlerTabs` and the Search/Sync grid
- On click, set state to open a full-screen Dialog

**4. New component: src/components/suite/AlmostLostColdDatesDialog.tsx**

- Full-screen Dialog component
- Takes a `type` prop ('almost-lost' or 'cold-dates') and the client list
- Renders the clients using `FreshClientCard` with scroll
- Shows appropriate header with description text

### Files Summary

| File | Change |
|------|--------|
| `src/pages/FreshClients.tsx` | Add ALMOST LOST and COLD DATES grouping logic, separator, colors |
| `src/components/desktop/DesktopFreshClients.tsx` | Add status config entries for new categories |
| `src/components/suite/MobileSuiteLanding.tsx` | Add two clickable cards + full-screen popup in HomeTabContent |
| `src/components/suite/AlmostLostColdDatesDialog.tsx` | New full-screen dialog component for Suite landing |
