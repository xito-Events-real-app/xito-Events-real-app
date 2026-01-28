

## Keep Two-Column Layout - Show All Events at Once (No Tab Switching)

Modify the event details to keep the left/right column structure but display ALL events simultaneously without clickable tabs.

---

### Layout

```
┌─────────────────────────┬──────────────────────────────────────────────────────────┐
│ EVENT DETAILS           │                                                          │
├─────────────────────────┼──────────────────────────────────────────────────────────┤
│ MAGH 16                 │ Venue: Smart Palace, Chabhil, Kathmandu 📍 8AM-9PM (250) │
│ WEDDING BRIDE SIDE      │ Parlour: Glam Studio, Lazimpat 📍 6AM-8AM                │
├─────────────────────────┼──────────────────────────────────────────────────────────┤
│ MAGH 17                 │ Venue: ...                                               │
│ PRE + RECEPTION         │ Parlour: ...                                             │
├─────────────────────────┼──────────────────────────────────────────────────────────┤
│ FALGUN 28               │ Venue: ...                                               │
│ POST SHOOT              │ Parlour: ...                                             │
└─────────────────────────┴──────────────────────────────────────────────────────────┘
```

**Left Column:** All event names/dates stacked (not clickable)
**Right Column:** Corresponding venue/parlour details for each event

---

### Changes to `DashboardEventDetails.tsx`

| Change | Description |
|--------|-------------|
| Remove `useState` | No tab selection needed |
| Keep flex layout | Maintain left (w-1/4) and right (w-3/4) columns |
| Map all events | Each event shows as a row with left name + right details |
| Remove click handlers | Event names are display-only, not buttons |
| Smaller text | Reduce from `text-base` to `text-sm` for details |

---

### New Structure

```typescript
{events.map((event, idx) => (
  <div key={event.eventIndex} className="flex gap-4 border-b border-slate-700/30 pb-3 last:border-0">
    {/* LEFT - Event Name/Date */}
    <div className="w-1/4 min-w-[120px]">
      <div className="text-sm font-bold uppercase text-emerald-400">
        {monthName} {event.eventDay}
      </div>
      <div className="text-xs text-white/70">{event.eventName}</div>
    </div>
    
    {/* RIGHT - Venue & Parlour */}
    <div className="w-3/4 space-y-2">
      <div className="text-xs">Venue: {venueName}, {area}... 📍 {time} ({guests})</div>
      <div className="text-xs">Parlour: {parlourName}... 📍 {time}</div>
    </div>
  </div>
))}
```

---

### File to Modify

| File | Changes |
|------|---------|
| `src/components/client-detail/DashboardEventDetails.tsx` | Remove tabs, show all events in rows with left/right columns |

