

## Add Event Details to Dashboard - Left Tabs, Right Details Layout

Add an event details display to the Dashboard section with a **two-column layout**: event tabs on the left, venue/parlour details on the right.

---

### Requested Layout

```
┌─────────────────────────┬──────────────────────────────────────────────────────────┐
│ EVENT DETAILS           │                                                          │
├─────────────────────────┤                                                          │
│ MAGH 16 WEDDING         │ VENUE                                                    │
│ BRIDE SIDE              │ SMART PALACE, CHABHIL, KATHMANDU  📍  8 AM - 9 PM (250)  │
│                         │                                                          │
│ MAGH 17 PRE+RECEPTION   │ PARLOUR                                                  │
│                         │ GLAM STUDIO, LAZIMPAT, KATHMANDU  📍  6 AM - 8 AM        │
│ FALGUN 28 POST SHOOT    │                                                          │
│                         │                                                          │
└─────────────────────────┴──────────────────────────────────────────────────────────┘
```

**Left Column:** Vertical event tabs (clickable)
**Right Column:** Venue & Parlour details for selected event

---

### Implementation Details

#### 1. Create `DashboardEventDetails.tsx`

Two-column flex layout:
- **Left (w-1/4):** Vertical list of event buttons/tabs
- **Right (w-3/4):** Venue and Parlour sections

```typescript
<div className="flex gap-4">
  {/* LEFT - Event Tabs */}
  <div className="w-1/4 space-y-2">
    {events.map(event => (
      <button 
        key={event.eventIndex}
        onClick={() => setSelectedIndex(event.eventIndex)}
        className={selectedIndex === event.eventIndex ? 'bg-emerald-600' : 'bg-slate-700'}
      >
        {getMonthName(event.eventMonth)} {event.eventDay}
        {event.eventName}
      </button>
    ))}
  </div>
  
  {/* RIGHT - Details */}
  <div className="w-3/4">
    <div>VENUE: {selectedEvent.venueName}, {selectedEvent.venueArea}...</div>
    <div>PARLOUR: {selectedEvent.parlourName}...</div>
  </div>
</div>
```

#### 2. Tab Label Format (Stacked)
```
MAGH 16 WEDDING
BRIDE SIDE
```
- Line 1: `{MONTH} {DAY} {EVENT_TYPE}` (e.g., "MAGH 16 WEDDING")
- Line 2: Event name details (e.g., "BRIDE SIDE")

#### 3. Venue Line Format
```
SMART PALACE, CHABHIL, KATHMANDU  📍  8 AM - 9 PM  (250 GUESTS)
```

#### 4. Parlour Line Format (No Guests)
```
GLAM STUDIO, LAZIMPAT, KATHMANDU  📍  6 AM - 8 AM
```

---

### Files to Create/Modify

| File | Changes |
|------|---------|
| `src/components/client-detail/DashboardEventDetails.tsx` | **NEW** - Two-column layout with vertical tabs |
| `src/components/client-detail/ClientHeroSection.tsx` | Add DashboardEventDetails below quotation section |
| `src/components/client-detail/index.ts` | Export new component |
| `src/pages/ClientDetail.tsx` | Pass events and eventDetailsData to ClientHeroSection |

---

### Styling

- **Left tabs:** Dark background, emerald highlight for selected, stacked text
- **Right details:** Large readable text, good contrast
- **Venue name:** Bold white
- **Map link:** Blue clickable icon
- **Time range:** Emerald color
- **Guest count:** Amber color (venue only)

