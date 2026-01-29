

## Fix Missing Form Fields + Styling in FullScreenEventCard

The current `FullScreenEventCard` is missing several form sections that exist in the original `EventDetailCard`, and the styling doesn't match the dashboard's dark gradient theme.

---

### Missing Form Fields

| Feature | EventDetailCard | FullScreenEventCard |
|---------|-----------------|---------------------|
| Open Maps button | Has button next to map input | Missing |
| Event Demands | Dynamic list (4 default slots, add/remove) | Missing entirely |
| Event References | Dynamic list (2 default slots, add/remove) | Missing entirely |
| Groom in Mehndi | Uses Switch component | Uses Select dropdown |
| Urgency Warning | Red banner when < 20 days | Missing |

---

### Styling Issues

**Current (FullScreenEventCard):**
- Card background: `bg-blue-500/20` (solid color overlay)
- No gradient background in expanded mode
- Labels: `text-white/50`

**Original (EventDetailCard):**
- Card background: `bg-gradient-to-br from-blue-500/20 to-indigo-500/20`
- Proper dark theme inputs: `bg-white/5 border-white/10 placeholder:text-white/30`
- Section headers use gradient-matching colors

---

### Solution

Update `FullScreenEventCard.tsx` to:

1. **Add Event Demands section** - Dynamic list with 4 default inputs, add/remove buttons
2. **Add Event References section** - Dynamic list with 2 default inputs, add/remove buttons  
3. **Change Groom switch** - Replace Select with Switch component
4. **Add "Open Maps" buttons** - Next to venue and parlour map inputs
5. **Add Urgency Warning banner** - Show when event is within 20 days and has empty fields
6. **Fix card styling** - Use gradient backgrounds matching EventDetailCard

---

### Visual Result

**Expanded Edit Form (after fix):**
```
┌─────────────────────────────────────────────────────────────┐
│ WEDDING - Baisakh 15, 2082                           [▲]   │
├─────────────────────────────────────────────────────────────┤
│ ⚠️ Event is in less than 20 days! Some details missing.    │
├─────────────────────────────────────────────────────────────┤
│ 📍 Venue Details                                            │
│ ┌─────────────┐ ┌─────────────┐                            │
│ │ Type ▼      │ │ Venue Name  │                            │
│ └─────────────┘ └─────────────┘                            │
│ ┌─────────────┐ ┌─────────────┐                            │
│ │ City        │ │ Area        │                            │
│ └─────────────┘ └─────────────┘                            │
│ ┌───────────────────────────────┐ ┌─────────────┐          │
│ │ Google Maps URL               │ │ Open Maps   │          │
│ └───────────────────────────────┘ └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│ 🕐 Event Timing                                             │
│ ┌─────────────┐ ┌─────────────┐                            │
│ │ Start: 10:00│ │ End: 18:00  │                            │
│ └─────────────┘ └─────────────┘                            │
├─────────────────────────────────────────────────────────────┤
│ 📍 Parlour Details                                          │
│ ... (same as venue)                                        │
├─────────────────────────────────────────────────────────────┤
│ 👥 Additional Info                                          │
│ ┌──────────────────────────────┐ ┌─────────────┐           │
│ │ Groom comes in Mehndi?  [⚪] │ │ Guests: 500 │           │
│ └──────────────────────────────┘ └─────────────┘           │
├─────────────────────────────────────────────────────────────┤
│ 📝 Event Demands                    (NEW!)                  │
│ 1. ┌─────────────────────────┐ [🗑]                         │
│ 2. ┌─────────────────────────┐ [🗑]                         │
│ 3. ┌─────────────────────────┐ [🗑]                         │
│ 4. ┌─────────────────────────┐ [🗑]                         │
│ [+ Add More]                                                │
├─────────────────────────────────────────────────────────────┤
│ 🔗 Event References                 (NEW!)                  │
│ 1. ┌─────────────────────────┐ [🗑]                         │
│ 2. ┌─────────────────────────┐ [🗑]                         │
│ [+ Add More]                                                │
├─────────────────────────────────────────────────────────────┤
│           [Cancel]      [💾 Save Changes]                   │
└─────────────────────────────────────────────────────────────┘
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/client-detail/FullScreenEventCard.tsx` | Add missing form sections (Demands, References), fix Groom switch, add Open Maps buttons, add urgency warning, update styling to use gradients |

---

### Technical Details

**1. Add Event Demands state:**
```typescript
const [demands, setDemands] = useState<string[]>(
  event.eventDemands?.length ? event.eventDemands : ['', '', '', '']
);
```

**2. Add Event References state:**
```typescript
const [references, setReferences] = useState<string[]>(
  event.eventReferences?.length ? event.eventReferences : ['', '']
);
```

**3. Replace Groom Select with Switch:**
```typescript
const [doGroomComeInMehndi, setDoGroomComeInMehndi] = useState(
  event.doGroomComeInMehndi === 'YES'
);
```

**4. Fix card gradient styling:**
```typescript
// Match EventDetailCard gradient pattern
const getEventColor = () => {
  const upper = eventName.toUpperCase();
  if (upper.includes('WEDDING')) return 'from-blue-500/20 to-indigo-500/20 border-blue-500/30';
  if (upper.includes('RECEPTION')) return 'from-purple-500/20 to-violet-500/20 border-purple-500/30';
  // ... etc
};

// Apply in Card className
<Card className={cn(
  "transition-all duration-300 border rounded-xl",
  isExpanded && `bg-gradient-to-br ${getEventColor()}`
)}>
```

**5. Update save handler to include demands/references:**
```typescript
const handleSave = async () => {
  await onSave(event.eventIndex, {
    ...formData,
    doGroomComeInMehndi: doGroomComeInMehndi ? 'YES' : '',
    eventDemands: demands.filter(d => d.trim()),
    eventReferences: references.filter(r => r.trim()),
  });
};
```

