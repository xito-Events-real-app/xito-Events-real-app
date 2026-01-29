

## Show Event Details for All Clients (Not Just Booked)

Display event information on the Dashboard section for ALL clients, using basic event data from the client record when detailed logistics data isn't available.

---

### Root Cause

Currently:
1. `getClientEventDetails` only fetches from **'BOOKED CLIENTS EVENT DETAILS'** sheet
2. Non-booked clients don't exist in that sheet
3. `DashboardEventDetails` returns `null` when no event details data exists

---

### Solution

Pass the client's basic event data as a fallback prop to `DashboardEventDetails`. When detailed event data from the BOOKED sheet isn't available, display the basic event info (name, date) with "Not set" for venue/parlour.

---

### Layout for Non-Booked Clients

```
┌─────────────────────────┬──────────────────────────────────────────────────────────┐
│ EVENT DETAILS           │                                                          │
├─────────────────────────┼──────────────────────────────────────────────────────────┤
│ MAGH 16                 │ Venue: Not set                                           │
│ WEDDING                 │ Parlour: Not set                                         │
├─────────────────────────┼──────────────────────────────────────────────────────────┤
│ MAGH 17                 │ Venue: Not set                                           │
│ RECEPTION               │ Parlour: Not set                                         │
└─────────────────────────┴──────────────────────────────────────────────────────────┘
```

---

### Technical Changes

#### 1. Update `DashboardEventDetails.tsx`

Add a new prop for fallback client data:

```typescript
interface DashboardEventDetailsProps {
  eventDetailsData: EventDetailsData | null;
  isLoading?: boolean;
  // NEW: Fallback client data for non-booked clients
  clientEvents?: {
    events: string;      // newline-separated
    eventYear: string;   // newline-separated
    eventMonth: string;  // newline-separated
    eventDay: string;    // newline-separated
  };
}
```

Build basic events from client data when `eventDetailsData` is null:

```typescript
// If no detailed event data, build from client events
const events = eventDetailsData?.events || buildBasicEvents(clientEvents);

function buildBasicEvents(clientData) {
  if (!clientData?.events) return [];
  
  const names = clientData.events.split('\n');
  const years = clientData.eventYear.split('\n');
  const months = clientData.eventMonth.split('\n');
  const days = clientData.eventDay.split('\n');
  
  return names.map((name, i) => ({
    eventIndex: i,
    eventName: name.trim(),
    eventYear: years[i] || '',
    eventMonth: months[i] || '',
    eventDay: days[i] || '',
    // All logistics fields empty
    venueName: '', venueArea: '', venueCity: '', venueMap: '',
    eventStartTime: '', eventEndTime: '',
    parlourName: '', parlourArea: '', parlourCity: '', parlourMap: '',
    parlourStartTime: '', parlourEndTime: '',
    guestCount: ''
  })).filter(e => e.eventName);
}
```

#### 2. Update `ClientHeroSection.tsx`

Pass client event data as fallback:

```typescript
<DashboardEventDetails 
  eventDetailsData={eventDetailsData}
  isLoading={eventDetailsLoading}
  clientEvents={{
    events: client.events || '',
    eventYear: client.eventYear || '',
    eventMonth: client.eventMonth || '',
    eventDay: client.eventDay || '',
  }}
/>
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/client-detail/DashboardEventDetails.tsx` | Add `clientEvents` prop, build fallback events when no detailed data |
| `src/components/client-detail/ClientHeroSection.tsx` | Pass client event data as fallback prop |

---

### Result

- **Booked clients**: Show full details (venue, parlour, timing, guests)
- **Non-booked clients**: Show event names and dates with "Not set" placeholders for logistics

