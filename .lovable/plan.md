

## Modify Event Details to Tab-Based Display with Summary Card

Transform the current accordion-style event cards into a tab-based interface that shows saved event details in a summary card format.

---

### Current Behavior
- Events are displayed as expandable cards (accordion style)
- Each card shows "Details added" or "Not filled" badge when collapsed
- Clicking a card expands it to show/edit the full form

### New Behavior
- Event names appear as horizontal **tabs** (e.g., "WEDDING", "RECEPTION")
- Below the tabs, a **summary card** displays the saved details for the selected event
- Clicking a tab switches the card content to that event's details
- An "Edit Details" button opens the form for editing

---

### UI Design

```text
+------------------------------------------+
|  [WEDDING]   [RECEPTION]   [PRE-WEDDING] |   <-- Event Tabs
+------------------------------------------+
|                                          |
|  VENUE DETAILS                           |
|  Type: HOTEL  |  Name: Grand Hyatt       |
|  City: Kathmandu  |  Area: Durbar Marg   |
|                                          |
|  EVENT TIMING                            |
|  Start: 10:00 AM  |  End: 4:00 PM        |
|                                          |
|  PARLOUR DETAILS                         |
|  Name: Glam Studio  |  City: Lalitpur    |
|                                          |
|  GUEST COUNT: 500                        |
|                                          |
|  [Edit Details]                          |
+------------------------------------------+
```

---

### Implementation Details

#### 1. Create New Component: `EventDetailsSummaryCard.tsx`
A new read-only card component that displays saved event details in a clean summary format with sections for:
- Venue info (type, name, city, area, map link)
- Event timing (start/end)
- Parlour info (if filled)
- Guest count
- Demands and references

Empty fields will be shown as "Not set" or hidden for cleaner display.

#### 2. Modify `ClientDetail.tsx` Events Section
Replace the current map of `EventDetailCard` components with:
- A `Tabs` component using existing shadcn/ui tabs
- `TabsTrigger` for each event name (with color coding based on event type)
- `TabsContent` containing the summary card for each event
- An "Edit Details" button that opens a dialog/drawer with the existing `EventDetailCard` form

#### 3. Edit Mode
When user clicks "Edit Details":
- Open a sheet/dialog containing the current `EventDetailCard` form
- On save, close the dialog and refresh the summary card

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/client-detail/EventDetailsSummaryCard.tsx` | **NEW** - Read-only summary card showing saved event details |
| `src/pages/ClientDetail.tsx` | Update events section to use tabs + summary card pattern |
| `src/components/client-detail/index.ts` | Export new component |

---

### Technical Notes

1. **Selected Tab State**: Track `selectedEventIndex` in the events section
2. **Tab Styling**: Reuse existing event color logic (wedding=blue, reception=purple, etc.)
3. **Empty State**: If no details saved, show a prompt card with "Add event details" button
4. **Loading State**: Show skeleton while `eventDetailsData` is loading
5. **Form Editing**: Reuse existing `EventDetailCard` component in a Sheet for editing

