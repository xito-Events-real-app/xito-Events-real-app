

## Rename "Events" to "Event Details" + Full-Screen Expandable View

Currently, the sidebar tab is named "Events" and shows event details in a tabbed UI with summary cards. The request is to:
1. Rename sidebar tab "Events" to "Event Details"
2. Create a full-screen event details view (not embedded in dashboard layout)
3. Show client name and handler as a compact header
4. Click on event date to expand into edit mode
5. In normal mode, show all event details expanded

---

### Current Structure

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR  │            CONTENT AREA                         │
│           │  ┌─────────────────────────────────────────────┐│
│  Dashboard│  │  "Events & Dates" heading                  ││
│  Events   │  │  ┌────────────────────────────────────┐    ││
│  Reg...   │  │  │ Tab: WEDDING │ Tab: RECEPTION       │    ││
│           │  │  ├────────────────────────────────────┤    ││
│           │  │  │  EventDetailsSummaryCard           │    ││
│           │  │  │  (with Edit button -> opens Sheet) │    ││
│           │  │  └────────────────────────────────────┘    ││
│           │  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

### Proposed Structure

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR       │         FULL-SCREEN EVENT DETAILS          │
│                │  ┌─────────────────────────────────────────┐│
│  Dashboard     │  │ CLIENT NAME          HANDLER: XY       ││
│  Event Details │  ├─────────────────────────────────────────┤│
│  Reg...        │  │                                         ││
│                │  │ ┌─────────────────────────────────────┐ ││
│                │  │ │ WEDDING - BAISAKH 15, 2082          │ ││
│                │  │ │ (Click to expand/edit)              │ ││
│                │  │ │                                     │ ││
│                │  │ │ Venue: Hotel Yak, Kathmandu         │ ││
│                │  │ │ Time: 10:00 AM - 6:00 PM            │ ││
│                │  │ │ Parlour: Jasmine Salon, Patan       │ ││
│                │  │ │ ... (all details shown)             │ ││
│                │  │ └─────────────────────────────────────┘ ││
│                │  │                                         ││
│                │  │ ┌─────────────────────────────────────┐ ││
│                │  │ │ RECEPTION - BAISAKH 16, 2082        │ ││
│                │  │ │ (Click to expand/edit)              │ ││
│                │  │ │ ... details ...                     │ ││
│                │  │ └─────────────────────────────────────┘ ││
│                │  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

### Visual Behavior

**Normal Mode (Collapsed):**
- All events listed vertically as cards
- Each card shows ALL details in a compact read-only format
- Click anywhere on the card expands it into edit mode

**Edit Mode (Expanded):**
- Card expands with form fields visible
- Inline editing of all event details
- Save/Cancel buttons at the bottom
- Other cards remain collapsed

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/client-detail/ClientDetailSidebar.tsx` | Rename label from "Events" to "Event Details" (line 26) |
| `src/pages/ClientDetail.tsx` | Replace Events section (lines 1158-1303) with new full-screen layout showing compact header + expandable event cards |
| `src/components/client-detail/FullScreenEventCard.tsx` | **NEW** - Create new component for full-screen event cards with click-to-expand edit functionality |

---

### Technical Details

**1. Sidebar Label Change:**
```typescript
// ClientDetailSidebar.tsx line 26
{ id: 'events', label: 'Event Details', icon: Calendar },
```

**2. Full-Screen Event Section Layout:**
- Remove "Events & Dates" heading
- Add compact header bar with client name (left) and handler badge (right)
- Render events as vertical list of expandable cards
- Each card shows all details by default (not hidden behind tabs)

**3. FullScreenEventCard Component:**
- Props: `event`, `onSave`, `isExpanded`, `onToggleExpand`
- Collapsed state: Shows all details in read-only format
- Expanded state: Shows edit form (similar to current EventDetailCard)
- Click on card header/date toggles expand/collapse
- Visual indicator showing which card is in edit mode

**4. State Management:**
- Track `expandedEventIndex: number | null` for which card is in edit mode
- Click on collapsed card sets that index as expanded
- Save or click elsewhere collapses back to read-only

