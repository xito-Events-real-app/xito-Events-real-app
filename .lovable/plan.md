

# Fix: Unknown Date (`**`) Events Incorrectly Appearing in Upcoming Events

## Problem

Shakti Neupane has 5 events. The last one ("POST SHOOT") has date `CHAITRA **` (unknown day). In the database, `event_date_ad` is stored as `2026-03-**`.

In the "Upcoming Events" hero on the Suite landing page, this event incorrectly shows as "in 2 days / Mar 1". This happens because `new Date("2026-03-**")` in some browser engines falls back to parsing as `March 1, 2026` instead of returning `Invalid Date`.

## Root Cause

```text
event_date_ad = "2026-03-**"
           |
   new Date("2026-03-**")
           |
   Some browsers parse as March 1, 2026 (not NaN!)
           |
   isNaN check passes -> event appears as upcoming
           |
   Shows "2 days" countdown to Mar 1
```

## Fix (2 files)

### File 1: `src/components/suite/TodayEventsHero.tsx`

In `getUpcomingEvents()`, add an early check to skip any `dateStr` containing `**` before attempting `new Date()` parsing.

**Change in the `eventDates.forEach` loop (around line 42):**
```typescript
eventDates.forEach((dateStr: string, idx: number) => {
  if (!dateStr?.trim()) return;
  // Skip unknown-day dates (contain **)
  if (dateStr.includes('**')) return;
  
  const eventDate = new Date(dateStr.trim());
  // ... rest unchanged
});
```

### File 2: `src/components/crew-schedule/UpcomingEventsSection.tsx`

In the `useMemo` filter, skip assignments where `event_day` contains `**`. Currently `parseInt("**")` returns `NaN` which becomes `0`, potentially letting the event pass the date comparison.

**Change in the filter (around line 27):**
```typescript
return assignments
  .filter(a => {
    // Skip unknown-day events
    if (!a.event_day || a.event_day.includes('**')) return false;
    
    const y = parseInt(a.event_year || "0");
    const m = parseInt(a.event_month || "0");
    const d = parseInt(a.event_day || "0");
    return y > tY || (y === tY && m > tM) || (y === tY && m === tM && d >= tD);
  })
```

## What This Does NOT Change

- Unknown-day events still appear correctly in the Booking Calendar (as orange `**` badges)
- Unknown-day events still appear in the client detail page
- No data is modified -- this is purely a display filter fix

## Risk Assessment

- Zero risk to data: read-only display filter
- Zero risk to other modules: changes are isolated to 2 upcoming-events views
- Unknown-day events are intentionally excluded from countdowns since there's no actual date to count down to
