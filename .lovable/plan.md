

## Client Page Event Details - Expandable Event Forms

This plan adds detailed event logistics forms to the Client Detail page's Events section. Each event box will be expandable to reveal fields for venue, timing, parlour, and logistics information that syncs with the `BOOKED CLIENTS EVENT DETAILS` Google Sheet.

---

### Understanding the Data Structure

**Key Insight**: The `BOOKED CLIENTS EVENT DETAILS` sheet stores multiple events per client using newline-separated values in each column. For example:
- Column D (events): `"WEDDING\nRECEPTION"`
- Column J (venueType): `"OUTDOOR\nINDOOR"`

Each event corresponds to a specific line number (1st event = line 1, 2nd event = line 2, etc.). Updates must preserve line alignment across all columns.

**Columns to Use (J-AH, excluding X-AD)**:
- **Venue**: J (Type), K (Name), L (City), M (Area), N (Map)
- **Event Time**: O (Start), P (End)
- **Parlour**: Q (Type), R (Name), S (City), T (Area), U (Map)
- **Parlour Time**: V (Start), W (End)
- **Skip columns X-AD** (preShoot fields - not needed per user request)
- **Misc**: AE (Groom in Mehndi), AF (Guest Count), AG (Demands), AH (References)

---

### Architecture

```text
+------------------------------------------+
| ClientDetail.tsx (Events Section)        |
+------------------------------------------+
|  Events Tabs (existing)                  |
|  +--------------------------------------+|
|  | EventDetailCard (NEW COMPONENT)     ||
|  | - Collapsed: Summary / "Not filled" ||
|  | - Expanded: Full form fields        ||
|  +--------------------------------------+|
+------------------------------------------+
            |
            v
+------------------------------------------+
| useEventDetails hook (NEW)               |
| - Fetches event details for client       |
| - Parses multi-line data by event index  |
| - Handles save with line alignment       |
+------------------------------------------+
            |
            v
+------------------------------------------+
| sheets-api.ts                            |
| - getClientEventDetails (NEW)            |
| - updateClientEventDetails (NEW)         |
+------------------------------------------+
            |
            v
+------------------------------------------+
| Edge Function: google-sheets             |
| - getClientEventDetails action           |
| - updateClientEventDetails action        |
| (Uses registeredDateTimeAD as unique ID) |
+------------------------------------------+
```

---

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/client-detail/EventDetailCard.tsx` | Expandable event form component |
| `src/hooks/useEventDetails.ts` | Custom hook for fetching/updating event details |

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/ClientDetail.tsx` | Replace simple event display with EventDetailCard |
| `src/lib/sheets-api.ts` | Add getClientEventDetails and updateClientEventDetails functions |
| `supabase/functions/google-sheets/index.ts` | Add new action handlers for event detail CRUD |

---

### Component Design: EventDetailCard

**Collapsed State** (default):
- Shows event name, date, and summary badge
- Badge shows "Not filled" (gray) OR "Details added" (green) based on data
- Click to expand

**Expanded State**:
Organized form sections with the exact field order specified:

**Line 1 - Venue Details:**
```
[Dropdown: Venue Type] [Text: Venue Name]
[Text: Venue City] [Text: Venue Area]
[URL: Venue Map] [Button: Open Google Maps]
```

**Line 2 - Event Timing:**
```
[Time: Event Start] [Time: Event End]
```

**Line 3 - Parlour Details:**
```
[Dropdown: Parlour Type] [Text: Parlour Name]
[Text: Parlour City] [Text: Parlour Area]
[URL: Parlour Map] [Button: Open Google Maps]
```

**Line 4 - Parlour Timing:**
```
[Time: Parlour Start] [Time: Parlour End]
```

**Line 5 - Additional Info:**
```
[Toggle: Does Groom Come in Mehndi?] [Number: Guest Count]
```

**Line 6 - Event Demands:**
```
[TextList: 1. ______ 2. ______ 3. ______ 4. ______]
[Button: + Add More]
```
Saved as: `"Demand 1" "Demand 2" "Demand 3"`

**Line 7 - References:**
```
[URL Input + Label: Reference 1]
[URL Input + Label: Reference 2]
[Button: + Add More]
```
Saved as: `"https://link1" "https://link2"`

**Footer:**
```
[Warning: Urgency alert if event <20 days and fields empty]
[Button: Save Details]
```

---

### Data Flow

**Fetching Event Details:**
1. `ClientDetail.tsx` calls `useEventDetails(registeredDateTimeAD)`
2. Hook calls `getClientEventDetails(registeredDateTimeAD)`
3. Edge function looks up client in EVENT DETAILS sheet by Column A
4. Returns parsed data with multi-line values split into arrays
5. Each event gets data at its corresponding index

**Saving Event Details:**
1. User edits fields in EventDetailCard
2. On save, call `updateClientEventDetails(registeredDateTimeAD, eventIndex, updates)`
3. Edge function fetches current multi-line data for all columns
4. Updates the specific line (eventIndex) while preserving other lines
5. Writes back to sheet with newline-joined values

---

### Edge Function Changes

**New Action: `getClientEventDetails`**

```typescript
// Input: { registeredDateTimeAD: string }
// Output: { 
//   rowNumber: number,
//   events: Array<{
//     eventName: string,
//     eventIndex: number,
//     venueType: string,
//     venueName: string,
//     venueCity: string,
//     venueArea: string,
//     venueMap: string,
//     eventStartTime: string,
//     eventEndTime: string,
//     parlourType: string,
//     parlourName: string,
//     parlourCity: string,
//     parlourArea: string,
//     parlourMap: string,
//     parlourStartTime: string,
//     parlourEndTime: string,
//     doGroomComeInMehndi: string,  // "YES" or "NO" or ""
//     guestCount: string,
//     eventDemands: string[],        // Parsed array
//     eventReferences: string[],     // Parsed array
//   }>
// }
```

**New Action: `updateClientEventDetails`**

```typescript
// Input: { 
//   registeredDateTimeAD: string,
//   eventIndex: number,  // 0-based index
//   updates: {
//     venueType?: string,
//     venueName?: string,
//     ... other fields
//   }
// }
// Output: { success: boolean }
```

The update function will:
1. Fetch current row data (columns J-AH)
2. Split each column by `\n` into arrays
3. Update the specific index in each array
4. Rejoin with `\n` and write back

---

### Urgency Warning Logic

```typescript
function isEventUrgent(eventDateAD: string): boolean {
  const eventDate = new Date(eventDateAD);
  const now = new Date();
  const diffDays = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 20 && diffDays > 0;
}

function hasEmptyFields(eventDetails: EventDetail): boolean {
  return !eventDetails.venueType || 
         !eventDetails.venueName || 
         !eventDetails.eventStartTime;
}
```

Display a non-blocking red warning if `isEventUrgent() && hasEmptyFields()`.

---

### UI Components Breakdown

**Venue/Parlour Type Dropdown Options** (to be added to setup):
- `INDOOR`
- `OUTDOOR`
- `MIXED`
- `HOTEL`
- `BANQUET`
- `HOME`
- `OTHER`

**Time Picker**: Use native HTML time input for simplicity and mobile compatibility.

**Google Maps Button**:
```tsx
<Button 
  variant="outline" 
  size="sm"
  onClick={() => window.open('https://maps.google.com', '_blank')}
>
  <MapPin className="h-4 w-4 mr-1" /> Open Maps
</Button>
```

**Multi-value Inputs (Demands/References)**:
- Dynamic array of inputs
- "Add More" button appends new empty input
- Remove button on each (except first)
- Parse/serialize with quoted format: `"value1" "value2"`

---

### Implementation Steps

1. **Update Edge Function** (`supabase/functions/google-sheets/index.ts`)
   - Add `getClientEventDetails` function
   - Add `updateClientEventDetails` function with line-aware update logic
   - Register both in the action switch

2. **Update API Layer** (`src/lib/sheets-api.ts`)
   - Add TypeScript interfaces for event details
   - Add `getClientEventDetails()` function
   - Add `updateClientEventDetails()` function

3. **Create Hook** (`src/hooks/useEventDetails.ts`)
   - Fetch on mount with registeredDateTimeAD
   - Expose loading, error, data states
   - Provide update function with optimistic UI

4. **Create EventDetailCard** (`src/components/client-detail/EventDetailCard.tsx`)
   - Collapsible card component
   - Form fields organized by lines
   - Save button with loading state
   - Urgency warning display

5. **Update ClientDetail** (`src/pages/ClientDetail.tsx`)
   - Replace simple event tabs with EventDetailCard components
   - Pass event data and handlers

---

### Technical Details

**Parsing Quoted Strings (Demands/References):**
```typescript
function parseQuotedList(value: string): string[] {
  if (!value) return [];
  const matches = value.match(/"([^"]*)"/g);
  return matches ? matches.map(m => m.replace(/"/g, '')) : [];
}

function serializeQuotedList(items: string[]): string {
  return items.filter(Boolean).map(i => `"${i}"`).join(' ');
}
```

**Multi-line Value Update:**
```typescript
function updateLineAtIndex(existing: string, index: number, newValue: string): string {
  const lines = existing ? existing.split('\n') : [];
  // Pad array if needed
  while (lines.length <= index) {
    lines.push('');
  }
  lines[index] = newValue;
  return lines.join('\n');
}
```

---

### Styling

The EventDetailCard will match the existing Client Detail dark theme:
- Background: `bg-white/5` with `border border-white/10`
- Expanded state: Subtle gradient based on event type
- Form labels: `text-white/70`
- Inputs: Dark themed with proper contrast
- Save button: Primary gradient

---

### Error Handling

- Show toast on save success/failure
- Disable save button during submission
- Preserve form data on failed saves
- Show retry option on network errors

