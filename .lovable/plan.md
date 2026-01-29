

## Improve Event Details Tab Readability

You've noted that the "Event Details" sidebar section (below Dashboard) has text that's hard to read, while the Dashboard's event details display is clear and readable. The goal is to apply the same visual styling from the Dashboard's event display to the Event Details tab.

---

### Current Issue

The **FullScreenEventCard** component used in the Event Details tab has:
- Low contrast text colors (`text-white/50`, `text-white/90`)
- Complex gradient backgrounds that reduce readability
- Inconsistent visual language compared to the Dashboard

---

### Solution: Match Dashboard Styling

Apply the same clear, high-contrast styling from **DashboardEventDetails** to the read-only view in **FullScreenEventCard**:

| Element | Current (Hard to Read) | After (Dashboard Style) |
|---------|------------------------|-------------------------|
| Section labels | `text-white/50 text-xs` | `text-amber-400` / `text-purple-400` (color-coded) |
| Values | `text-white/90` | `text-white font-semibold` |
| Secondary info | `text-white/90` | `text-white/70 text-xs` |
| Dates | `text-white/60` | `text-emerald-400 font-bold` |
| Background | Complex gradients | `bg-slate-800/60` (solid, readable) |
| Times | Same as values | `text-emerald-400` (matches Dashboard) |

---

### Visual Comparison

**Before (Current - Hard to Read):**
```
┌─────────────────────────────────────────────────────────────┐
│ [W] WEDDING DAY                         [Details added ✓]  │
│     Magh 15, 2082                                           │
├─────────────────────────────────────────────────────────────┤
│  📍 Venue: INDOOR Not set          ← Low contrast text     │
│  🕐 Event Time: Not set            ← Hard to distinguish   │
│  ✂️ Parlour: Not set               ← All looks the same    │
│  🕐 Parlour Time: Not set                                  │
│  👥 Guest Count: Not set                                   │
└─────────────────────────────────────────────────────────────┘
```

**After (Dashboard Style - Clear & Readable):**
```
┌─────────────────────────────────────────────────────────────┐
│ [W] WEDDING DAY                         [Details added ✓]  │
│     Magh 15, 2082 (click to edit)                          │
├─────────────────────────────────────────────────────────────┤
│  MAGH 15      │ Venue: Hotel Himalaya, Lalitpur      │
│  Wedding Day  │        12:00 PM - 4:00 PM (500)      │
│               │ Parlour: Elegance Beauty, Kathmandu  │
│               │          9:00 AM - 11:00 AM          │
└─────────────────────────────────────────────────────────────┘
```

---

### Changes to Make

**File: `src/components/client-detail/FullScreenEventCard.tsx`**

1. **Update read-only collapsed view styling** (lines 310-418):
   - Change layout to two-column style matching Dashboard
   - Use color-coded labels: `text-amber-400` for Venue, `text-purple-400` for Parlour
   - Use `text-emerald-400` for date/time displays
   - Use `text-white font-semibold` for venue/parlour names
   - Keep background cleaner with `bg-slate-800/60` when collapsed

2. **Update the collapsed card background**:
   - Change from: `bg-white/5 border-white/10`
   - To: `bg-slate-800/60 border-slate-700/50`

3. **Restructure the read-only content layout**:
   - Use two-column layout like Dashboard (date on left, details on right)
   - Apply consistent color coding for each element type
   - Increase font weights for better readability

---

### Technical Details

The collapsed view in FullScreenEventCard (lines 310-418) will be refactored to:

```tsx
{/* Read-only Details View - Dashboard Style */}
<div className="px-4 pb-4">
  <div className="flex gap-4 border-t border-slate-700/30 pt-3">
    {/* LEFT - Date Column */}
    <div className="w-1/4 min-w-[100px]">
      <div className="text-sm font-bold uppercase text-emerald-400">
        {monthName} {event.eventDay}
      </div>
      <div className="text-xs text-white/70 mt-0.5">
        {event.eventYear}
      </div>
    </div>
    
    {/* RIGHT - Details Column */}
    <div className="w-3/4 space-y-2">
      {/* Venue Row */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-xs font-medium text-amber-400">Venue:</span>
        <span className="text-sm font-semibold text-white">{venueName}</span>
        <span className="text-xs text-white/70">{venueArea}, {venueCity}</span>
        <span className="text-xs font-medium text-emerald-400">{timeRange}</span>
        <span className="text-xs font-medium text-amber-400">({guestCount})</span>
      </div>
      
      {/* Parlour Row */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="text-xs font-medium text-purple-400">Parlour:</span>
        <span className="text-sm font-semibold text-white">{parlourName}</span>
        <span className="text-xs text-white/70">{parlourArea}, {parlourCity}</span>
        <span className="text-xs font-medium text-emerald-400">{parlourTimeRange}</span>
      </div>
    </div>
  </div>
</div>
```

**Key styling patterns from DashboardEventDetails to apply:**
- `text-emerald-400` for dates and times
- `text-amber-400` for "Venue:" label and guest count
- `text-purple-400` for "Parlour:" label
- `text-white font-semibold` for venue/parlour names
- `text-white/70 text-xs` for secondary location info (area, city)
- `text-blue-400` for map links
- `text-white/40 italic` for "Not set" placeholders

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/client-detail/FullScreenEventCard.tsx` | Update read-only view (lines 252-418) to use Dashboard-style layout and color coding |

---

### Result

After this change:
- Event Details tab will have the same clear, readable styling as the Dashboard
- Venue details in amber, Parlour in purple, Times in emerald - consistent color language
- High contrast text that's easy to read at a glance
- The edit form (expanded state) remains unchanged - only the read-only collapsed view is updated

