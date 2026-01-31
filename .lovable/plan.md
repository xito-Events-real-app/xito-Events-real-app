
# Plan: Update Star Client Detail View - Event Format Like Client Tracker

## Overview

Update the `StarClientDetailView` component to display event details in the format **"MAGH 14 MEHNDI"** - showing the Nepali month name (uppercase), day number, and event name - matching the style used in the Client Tracker.

---

## Current Issue

The current `StarClientDetailView` displays events like this:
```
Calendar Icon | "BRIDES MEHNDI"
             "10 2082" (month number + year)
```

This shows:
- Raw event name only
- Month as a number, not the name
- Year separately

---

## Desired Format

Change the display to show events like the Client Tracker:
```
MAGH 14 MEHNDI
```

Where:
- **MAGH** = Nepali month name (uppercase, converted from month number)
- **14** = Day number
- **MEHNDI** = Event name (uppercase)

---

## File to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/suite/StarClientDetailView.tsx` | UPDATE | Change event display format to "MONTH DAY EVENT" |

---

## Implementation Details

### Update the StarClientDetailView Component

Replace the current event display section:

**Current Code (lines 143-154):**
```tsx
{/* Event Details */}
<div className="bg-gray-100/80 rounded-lg p-3">
  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
    <Calendar className="w-4 h-4 text-amber-600" />
    {firstEvent}
  </div>
  {(client.eventMonth || client.eventYear) && (
    <p className="text-xs text-gray-500 mt-1 ml-6">
      {client.eventMonth} {client.eventYear}
    </p>
  )}
</div>
```

**New Code:**
```tsx
{/* Event Details - Display all events in "MAGH 14 MEHNDI" format */}
<div className="bg-gray-100/80 rounded-lg p-3 space-y-1.5">
  {(() => {
    // Parse all events using the existing utility
    const parsedEvents = parseEventDetails(
      client.events || '',
      client.eventYear || '',
      client.eventMonth || '',
      client.eventDay || ''
    );
    
    if (parsedEvents.length === 0) {
      return (
        <p className="text-sm text-gray-500 italic">No events scheduled</p>
      );
    }
    
    return parsedEvents.map((event, idx) => (
      <div key={idx} className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="text-sm font-bold text-gray-800 uppercase">
          {event.monthName} {event.day} {event.eventName}
        </span>
      </div>
    ));
  })()}
</div>
```

### Import the Utility

Add the import for `parseEventDetails`:
```tsx
import { parseEventDetails } from "@/lib/nepali-months";
```

---

## Visual Comparison

### Before
```
┌─────────────────────────────────────┐
│  📅 BRIDES MEHNDI                   │
│       10 2082                       │
└─────────────────────────────────────┘
```

### After (matching Client Tracker format)
```
┌─────────────────────────────────────┐
│  📅 MAGH 14 BRIDES MEHNDI           │
│  📅 MAGH 15 WEDDING                 │
│  📅 MAGH 16 RECEPTION               │
└─────────────────────────────────────┘
```

---

## Benefits

1. **Consistent with Client Tracker** - Same format used across the application
2. **Human-Readable Dates** - Shows "MAGH" instead of "10"
3. **All Events Visible** - Shows all events, not just the first one
4. **Memorable Format** - "MAGH 14 MEHNDI" is easy to remember and reference
5. **Compact Display** - Single line per event, efficient use of space

---

## Expected Result

When viewing star clients in the Suite dashboard, each client card will show their events in the format:
- **MAGH 14 BRIDES MEHNDI**
- **MAGH 15 WEDDING**
- **FALGUN 3 RECEPTION**

This matches exactly how events appear in the Client Tracker module.
