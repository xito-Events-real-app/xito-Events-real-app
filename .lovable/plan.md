

# Plan: Add Cold Dates Filter to Client Tracker Dashboard

## Overview

Add a "Cold Dates" filter option alongside "Hot Dates" in the Client Tracker dashboard. Cold Dates represent event dates where we have NO booked clients yet - these are opportunities for conversion since enquiring clients want those dates.

## What Are Cold Dates?

**Definition**: Dates that have enquiring clients (JUST ENQUIRED to ADVANCE PENDING) but **zero BOOKED** clients. These are "cold" because we haven't secured bookings for those dates yet.

**Display Logic**:
- Only show clients with statuses: JUST ENQUIRED, NUMBER PROVIDED, TEXTED, CALL NOT, QUOTATION PENDING, QUOTATION SENT, BARGAINING, ADVANCE PENDING
- Exclude BOOKED, CANCELLED, and BOOKED SOMEWHERE ELSE clients
- **Show ALL cold dates** - no limit on number displayed
- Prioritize dates that are:
  1. In the nearest upcoming months first
  2. Have zero booked events on those dates
  3. Higher enquiry count within same priority

---

## Visual Design

### Cold Date Card Format
```text
┌────────────────────────────────────┐
│ ❄️  MAGH 23  2082                  │
├────────────────────────────────────┤
│ Client Name • Event • STATUS • 👤 │
│ Client Name • Event • STATUS • 👤 │
│ Client Name • Event • STATUS • 👤 │
└────────────────────────────────────┘
```

- **Cold blue/cyan color theme** (vs orange/red for Hot Dates)
- **Date displayed prominently at top** with cold colors
- **Each client row shows**: Client Name, Event Name, Current Status Badge, Handler initials
- **Client names are clickable** (navigate to client detail)
- **No BOOKED/ENQUIRY tags** - just the date header in cold blue

---

## Technical Implementation

### File: `src/components/desktop/DesktopDashboard.tsx`

**1. Add imports**
```typescript
import { Snowflake } from "lucide-react";
```

**2. Add state for toggle**
```typescript
const [showColdDates, setShowColdDates] = useState(false);
```

**3. Add coldDates useMemo calculation**
```typescript
const coldDates = useMemo(() => {
  const ENQUIRY_ON_STATUSES = [
    'JUST ENQUIRED', 'NUMBER PROVIDED', 'TEXTED', 'CALL NOT',
    'QUOTATION PENDING', 'QUOTATION SENT', 'BARGAINING', 'ADVANCE PENDING'
  ];
  
  const BOOKED_STATUSES = ['BOOKED'];
  
  // Build map of all dates and their clients
  const dateMap: Record<string, {
    dateKey: string;
    year: string;
    month: string;
    monthName: string;
    day: string;
    bookedCount: number;
    enquiringClients: Array<{
      clientName: string;
      eventName: string;
      status: string;
      statusShort: string;
      handler: string;
      handlerInitials: string;
      id: string;
    }>;
  }> = {};

  statsClients.forEach(client => {
    const status = getCurrentStatus(client.statusLog || '').toUpperCase();
    const events = parseEventDetails(
      client.events || '',
      client.eventYear || '',
      client.eventMonth || '',
      client.eventDay || ''
    );

    events.forEach(event => {
      if (!event.year || !event.month || !event.day) return;
      
      const dateKey = `${event.year}-${event.month.padStart(2, '0')}-${String(event.day).padStart(2, '0')}`;
      
      if (!dateMap[dateKey]) {
        dateMap[dateKey] = {
          dateKey,
          year: event.year,
          month: event.month,
          monthName: event.monthName,
          day: event.day,
          bookedCount: 0,
          enquiringClients: []
        };
      }

      // Count booked clients
      if (status.includes('BOOKED') && !status.includes('BOOKED SOMEWHERE ELSE')) {
        dateMap[dateKey].bookedCount++;
      }
      
      // Track enquiring clients
      if (ENQUIRY_ON_STATUSES.some(s => status.includes(s))) {
        const handler = client.clientHandler || client.whoAdded || '';
        dateMap[dateKey].enquiringClients.push({
          clientName: client.clientName || 'Unknown',
          eventName: event.eventName || 'Event',
          status: status,
          statusShort: status.split(' ')[0], // First word
          handler: handler,
          handlerInitials: handler.split(' ').map(n => n[0]).join('').slice(0, 2),
          id: client.registeredDateTimeAD || client.rowNumber?.toString() || ''
        });
      }
    });
  });

  // Filter to only dates with ZERO booked and at least 1 enquiring
  // Sort by nearest month first, then by enquiry count
  return Object.values(dateMap)
    .filter(d => d.bookedCount === 0 && d.enquiringClients.length > 0)
    .sort((a, b) => {
      // Sort by month proximity, then by enquiry count
      const monthDiff = parseInt(a.month) - parseInt(b.month);
      if (monthDiff !== 0) return monthDiff;
      return b.enquiringClients.length - a.enquiringClients.length;
    });
}, [statsClients]);
```

**4. Modify Hot Dates CardHeader to add toggle**

Replace the existing header with toggle buttons:
```tsx
<CardHeader className="pb-3">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Button 
        variant={showColdDates ? "ghost" : "default"}
        size="sm" 
        className={cn(
          "transition-all",
          !showColdDates && "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
        )}
        onClick={() => setShowColdDates(false)}
      >
        <Flame className="w-4 h-4 mr-1" />
        Hot Dates
        <Badge variant="secondary" className="ml-2">{hotDates.length}</Badge>
      </Button>
      <Button 
        variant={showColdDates ? "default" : "ghost"}
        size="sm"
        className={cn(
          "transition-all",
          showColdDates && "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600"
        )}
        onClick={() => setShowColdDates(true)}
      >
        <Snowflake className="w-4 h-4 mr-1" />
        Cold Dates
        <Badge variant="secondary" className="ml-2">{coldDates.length}</Badge>
      </Button>
    </div>
    {!showColdDates && (
      <Link to="/client-tracker/hot-dates">
        <Button variant="ghost" size="sm">View All →</Button>
      </Link>
    )}
  </div>
</CardHeader>
```

**5. Add Cold Dates grid (conditional rendering)**

```tsx
<CardContent>
  {showColdDates ? (
    /* Cold Dates Grid - Show ALL dates */
    <ScrollArea className="h-[400px]">
      <div className="grid grid-cols-4 gap-4">
        {coldDates.map((dateInfo) => (
          <div
            key={dateInfo.dateKey}
            className="border rounded-lg p-3 border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 hover:border-cyan-500/50 transition-colors"
          >
            {/* Cold Date Header */}
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-cyan-500/20">
              <Snowflake className="w-4 h-4 text-cyan-500" />
              <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                {dateInfo.monthName} {dateInfo.day}
              </Badge>
              <span className="text-xs text-muted-foreground">{dateInfo.year}</span>
              <Badge variant="outline" className="ml-auto text-cyan-600 border-cyan-500/30">
                {dateInfo.enquiringClients.length}
              </Badge>
            </div>
            
            {/* Client List - ALL clients */}
            <div className="space-y-1.5">
              {dateInfo.enquiringClients.map((client, i) => (
                <Link 
                  key={i}
                  to={`/client-tracker/client/${client.id}`}
                  className="flex items-center gap-2 p-1.5 rounded hover:bg-cyan-500/10 transition-colors group"
                >
                  <span className="font-medium text-xs truncate flex-1 group-hover:text-cyan-600">
                    {client.clientName}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[50px]">
                    {client.eventName}
                  </span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    {client.statusShort}
                  </Badge>
                  <span className="text-[10px] font-bold text-cyan-600">
                    {client.handlerInitials}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  ) : (
    /* Existing Hot Dates Grid */
    <div className="grid grid-cols-4 gap-4">
      {/* ... existing hot dates code ... */}
    </div>
  )}
</CardContent>
```

---

### File: `src/components/desktop/DesktopAppLayout.tsx`

**6. Add Cold Date filter state**

```typescript
// Around line 48, alongside selectedHotDate
const [selectedColdDate, setSelectedColdDate] = useState<string | null>(null);
```

**7. Update filteredClients to handle cold date filtering**

Add to the filteredClients useMemo:
```typescript
// Cold date filter - show only enquiring clients on this date
if (selectedColdDate) {
  const ENQUIRY_STATUSES = [
    'JUST ENQUIRED', 'NUMBER PROVIDED', 'TEXTED', 'CALL NOT',
    'QUOTATION PENDING', 'QUOTATION SENT', 'BARGAINING', 'ADVANCE PENDING'
  ];
  
  const status = normalizeStatus(getCurrentStatus(client.statusLog || '').toUpperCase());
  if (!ENQUIRY_STATUSES.some(s => status.includes(s))) return false;
  
  const [hYear, hMonth, hDay] = selectedColdDate.split('-').map(Number);
  const years = (client.eventYear || '').split('\n').filter(Boolean);
  const months = (client.eventMonth || '').split('\n').filter(Boolean);
  const days = (client.eventDay || '').split('\n').filter(Boolean);
  
  let hasMatch = false;
  for (let i = 0; i < Math.max(years.length, months.length, days.length); i++) {
    const y = parseInt(years[i]) || 0;
    const m = parseInt(months[i]) || 0;
    const d = parseInt(days[i]) || 0;
    if (y === hYear && m === hMonth && d === hDay) {
      hasMatch = true;
      break;
    }
  }
  if (!hasMatch) return false;
}
```

**8. Pass cold date props to children**

Update the enhancedChildren cloneElement:
```typescript
selectedColdDate,
onColdDateFilter: setSelectedColdDate,
onClearColdDate: () => setSelectedColdDate(null),
```

---

### File: `src/pages/Dashboard.tsx` (Mobile)

**9. Add Cold Dates section on mobile**

Add below the Hot Dates pills section:
```tsx
{/* Cold Dates Pills */}
<div className="space-y-2 mt-4">
  <div className="flex items-center gap-2 px-1">
    <Snowflake className="w-4 h-4 text-cyan-500" />
    <h3 className="text-sm font-semibold text-cyan-600">Cold Dates</h3>
    <Badge variant="outline" className="text-cyan-600 border-cyan-500/30">
      {coldDates.length}
    </Badge>
  </div>
  
  <ScrollArea className="w-full">
    <div className="flex gap-2 pb-2">
      {coldDates.map((date) => (
        <button
          key={date.dateKey}
          onClick={() => handleColdDateClick(date)}
          className="shrink-0 px-3 py-2 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 hover:border-cyan-500/50 transition-colors"
        >
          <div className="font-semibold text-sm text-cyan-700">
            {date.monthName} {date.day}
          </div>
          <div className="text-xs text-cyan-600">
            {date.enquiringClients.length} enquiries
          </div>
        </button>
      ))}
    </div>
  </ScrollArea>
</div>
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `DesktopDashboard.tsx` | Add `Snowflake` import, `showColdDates` state, `coldDates` useMemo, toggle buttons, Cold Dates grid with ScrollArea |
| `DesktopAppLayout.tsx` | Add `selectedColdDate` state, cold date filtering logic, pass props to children |
| `Dashboard.tsx` | Add Cold Dates pills section for mobile view |

---

## Key Difference from Hot Dates

| Aspect | Hot Dates | Cold Dates |
|--------|-----------|------------|
| **Color Theme** | Orange/Red 🔥 | Cyan/Blue ❄️ |
| **Definition** | Dates with any activity | Dates with 0 bookings |
| **Shows** | BOOKED + ENQUIRY + GONE | Only ENQUIRY statuses |
| **Tags** | BOOKED, ENQUIRY, GONE badges | No tags, just status |
| **Limit** | Top 6 with View All | **ALL dates shown** |
| **Purpose** | Track busy dates | Find conversion opportunities |

