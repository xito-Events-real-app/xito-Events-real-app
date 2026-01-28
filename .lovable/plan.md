

## Fix Event Line Alignment Between CLIENT TRACKER and BOOKED CLIENTS EVENT DETAILS

The event details are saving to the wrong event line because there's a mismatch between the event indices used by the CLIENT TRACKER data (which uses `.filter(Boolean)` to remove empty lines) and the actual line positions in the `BOOKED CLIENTS EVENT DETAILS` sheet.

---

### Root Cause Analysis

**Data Flow:**
1. Client events are stored in `CLIENT TRACKER` (columns L-P)
2. When client is booked, data syncs to `BOOKED CLIENTS` (columns L-P)
3. Event logistics data syncs to `BOOKED CLIENTS EVENT DETAILS` (columns D-H for events, J-AH for logistics)

**The Problem:**
- In `ClientDetail.tsx`, events are parsed with `.filter(Boolean)`:
  ```typescript
  const eventNames = (client.events || '').split('\n').filter(Boolean);
  ```
  This gives filtered indices (0, 1 for two events even if the original data was `"WEDDING\n\nRECEPTION"`)

- In the Edge Function, events are parsed WITHOUT filtering, but `numEvents` is calculated from filtered count:
  ```typescript
  const eventNames = (foundRow[3] || '').split('\n');
  const numEvents = eventNames.filter(e => e.trim()).length || 1;
  ```
  
- The `eventIndex` sent to `updateClientEventDetails` is the filtered display index, not the actual sheet line position

**Example:**
| Sheet Data | Display (filtered) | Actual Sheet Position |
|------------|-------------------|----------------------|
| `"WEDDING"` | Event 0 (WEDDING) | Line 0 |
| `""` (empty) | (not shown) | Line 1 |
| `"RECEPTION"` | Event 1 (RECEPTION) | Line 2 |

When user saves Event 1 (RECEPTION), the code sends `eventIndex: 1`, but it should update **line 2** in the sheet.

---

### Solution

Update the edge function's `getClientEventDetails` to track the **original line index** for each event, even after filtering out empty events. This ensures the correct line is updated.

---

### Implementation

**File: `supabase/functions/google-sheets/index.ts`**

Change the event building loop (around lines 2130-2161) to:

```typescript
// Build events array - filter empty names but preserve ORIGINAL line index
const events = [];

for (let i = 0; i < eventNames.length; i++) {
  const name = eventNames[i]?.trim();
  if (!name) continue; // Skip empty event names in display
  
  events.push({
    eventIndex: i,  // This is the ACTUAL sheet line index, not the display order
    eventName: name,
    eventYear: eventYears[i] || '',
    eventMonth: eventMonths[i] || '',
    eventDay: eventDays[i] || '',
    eventDateAD: eventDatesAD[i] || '',
    venueType: venueTypes[i] || '',
    venueName: venueNames[i] || '',
    venueCity: venueCities[i] || '',
    venueArea: venueAreas[i] || '',
    venueMap: venueMaps[i] || '',
    eventStartTime: eventStartTimes[i] || '',
    eventEndTime: eventEndTimes[i] || '',
    parlourType: parlourTypes[i] || '',
    parlourName: parlourNames[i] || '',
    parlourCity: parlourCities[i] || '',
    parlourArea: parlourAreas[i] || '',
    parlourMap: parlourMaps[i] || '',
    parlourStartTime: parlourStartTimes[i] || '',
    parlourEndTime: parlourEndTimes[i] || '',
    doGroomComeInMehndi: doGroomInMehndiArr[i] || '',
    guestCount: guestCounts[i] || '',
    eventDemands: parseQuotedList(eventDemandsArr[i] || ''),
    eventReferences: parseQuotedList(eventReferencesArr[i] || ''),
  });
}
```

**Key Change:** Remove the `numEvents` limit and instead loop through ALL `eventNames`, skipping empty ones with `continue`. This preserves the original `i` index (sheet line position) for each event.

---

### Why This Works

**Before:**
```
eventNames = ["WEDDING", "", "RECEPTION"]
numEvents = 2 (filtered count)
Loop i=0,1: creates events with eventIndex 0,1
But RECEPTION should have eventIndex 2!
```

**After:**
```
eventNames = ["WEDDING", "", "RECEPTION"]
Loop i=0: name="WEDDING" -> push with eventIndex:0
Loop i=1: name="" -> skip
Loop i=2: name="RECEPTION" -> push with eventIndex:2
Updates now go to correct line!
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/google-sheets/index.ts` | Update `getClientEventDetails` to preserve original line indices when skipping empty events |

---

### Additional Fix: Fallback in ClientDetail.tsx

The fallback case (lines 1197-1229) also needs to use the correct index. However, this is only triggered when no event details are found in the EVENT DETAILS sheet, which means the client hasn't been synced yet. In this case, we should:

1. Use the original unfiltered event parsing to get correct indices, OR
2. Ensure the sync happens before allowing event detail edits

For now, the Edge Function fix is the primary solution since it's the source of truth for indices.

---

### Testing Checklist

After implementation:
1. Open a client with 2+ events where the events have gaps (e.g., `WEDDING\n\nRECEPTION`)
2. Expand the second event (RECEPTION)
3. Fill in venue details and save
4. Check Google Sheet `BOOKED CLIENTS EVENT DETAILS`:
   - Column J (venueType) should have the value on line 3 (matching RECEPTION's position)
   - NOT on line 2 (the empty line)
5. Verify first event (WEDDING) data stays on line 1

