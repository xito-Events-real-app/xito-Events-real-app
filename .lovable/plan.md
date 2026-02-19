
# Fixes to the EventLogisticsPanel in AllClientsCrewTable

## Three User-Reported Issues

### Issue 1: Crew section is a separate row — should be inline below freelancer names
Currently the "Crew" section renders AFTER the cards in a bordered section below. The user wants crew names + notes to appear INSIDE the expanded panel, not as a new separated block.

### Issue 2: Calendar link opens full /crew-schedule page — should open `CrewScheduleEventSheet` popup
Currently the `<a href="/crew-schedule/...">` opens the freelancer's full page in a new tab. The user wants the same popup (`CrewScheduleEventSheet`) that already exists on the client detail page — showing ONLY that specific event's details.

### Issue 3: Venue area layout — area name next to the venue name, starting time in BIG letters
Currently: venue name → city (small) → **area** (bold, own line) → "Starts at" (tiny violet text)  
Requested: venue name + **AREA NAME** on the same row (or immediately adjacent), starting time displayed prominently.

---

## Solution Design

### Fix 1: Crew Section Inline — inside cards grid

Instead of a separate `<div>` section below all the cards with a border-top separator, the crew mini-cards should be part of the same `flex flex-wrap gap-2` cards row. The crew members get their own compact card type alongside Bride/Groom/Venue/Parlour.

**New approach:** Add each assigned crew member as a card in the `cards` array (same array as Bride/Groom/Venue/Parlour). Each crew card contains:
- Role code badge (colored)
- Freelancer name
- Personal note (if any) in amber
- Calendar sheet button (icon only)

This way crew cards flow naturally in the same horizontal flex-wrap row as the logistics cards — no separate section, no border-top divider.

```tsx
// Add crew cards into the same `cards` array
for (const col of CREW_COLUMNS) {
  const name = (row[col.field] as string)?.trim();
  if (!name) continue;
  const setting = settings.find(s =>
    s.freelancer_name?.trim().toLowerCase() === name.toLowerCase()
  );
  const note = setting?.personal_note?.trim() || '';
  cards.push(
    <div key={`crew-${col.field}-${name}`} className="border border-gray-200 rounded-lg p-2.5 bg-white min-w-[120px]">
      <span className="text-[10px] font-bold text-gray-400 uppercase">{col.short}</span>
      <div className="flex items-center justify-between gap-1 mt-0.5">
        <p className="text-xs font-semibold text-gray-800 truncate">{name}</p>
        <button
          onClick={() => setOpenCalendarFor({ name, col, row })}
          className="shrink-0 p-1 rounded hover:bg-violet-100 text-violet-400 hover:text-violet-600"
          title={`${name} event details`}
        >
          <CalendarIcon className="w-3 h-3" />
        </button>
      </div>
      {note && <p className="text-[10px] text-amber-700 bg-yellow-50 rounded px-1.5 py-0.5 mt-1 border border-yellow-100 whitespace-pre-line">{note}</p>}
    </div>
  );
}
```

### Fix 2: CrewScheduleEventSheet popup instead of full-page link

**How it works on the client page:** In `FreelancerAssignmentSection.tsx`, clicking the Calendar icon sets `calendarOpenFor` (a freelancer name string), which opens `<CrewScheduleEventSheet>` passing the current `assignment` mapped to `AssignmentRow` format, the matched `eventDetail`, contact details, and `freelancerName`.

**In AllClientsCrewTable:** We already have:
- `row: FreelancerAssignment` — has all crew assignment fields and event info
- `cached.eventDetail` — the fetched event_details_cache row
- `cached.contactDetail` — the fetched contact_details_cache row

We need to:
1. Add a state `calendarOpenFor: { name: string; row: FreelancerAssignment; eventDetail: any; contactDetail: any } | null` inside `EventLogisticsPanel`
2. Map `row` → `AssignmentRow` format (same mapping as in FreelancerAssignmentSection)
3. Render `<CrewScheduleEventSheet>` when state is set

Since `EventLogisticsPanel` is currently a pure function with no state, we need to convert it to use `useState`. The sheet also needs `eventDetail` typed as `EventDetail` from `useEventDetails`. The `cached.eventDetail` from `event_details_cache` uses the same column names so we can cast/map it.

**AssignmentRow mapping from FreelancerAssignment (`row`):**
```typescript
const mappedRow: AssignmentRow = {
  event_year: row.eventYear || null,
  event_month: row.eventMonth || null,
  event_day: row.eventDay || null,
  event: row.event || '',
  client_name: row.clientName || null,
  registered_date_time_ad: row.registeredDateTimeAD,
  photographer_bride: row.photographerBride || null,
  photographer_groom: row.photographerGroom || null,
  videographer_bride: row.videographerBride || null,
  videographer_groom: row.videographerGroom || null,
  extra_photographer: row.extraPhotographer || null,
  extra_videographer: row.extraVideographer || null,
  assistant: row.assistant || null,
  iphone_shooter: row.iphoneShooter || null,
  drone_operator: row.droneOperator || null,
  fpv_operator: row.fpvOperator || null,
};
```

**EventDetail mapping from `eventDetail` (event_details_cache row):**
The `CrewScheduleEventSheet` accepts `eventDetail?: EventDetail`. The `EventDetail` type from `useEventDetails` has many fields. We map the fetched `eventDetail` to match what the sheet needs (venue, parlour, times, etc.).

### Fix 3: Venue card — Area name adjacent to venue, start time in BIG letters

**Current layout (wrong):**
```
📍 VENUE
Taj Banquet Hall
[city — small gray]
Baneshwor [bold own line]
Starts at 8:00 AM [tiny violet]
Ends at... [tiny gray]
```

**New layout (correct):**
```
📍 VENUE
Taj Banquet Hall  ·  BANESHWOR
[city — small gray]
[Map →]

 8:00 AM
[small "Starts at" label above big time]
```

Specifically:
- Venue name + area on the **same line** (`venue_name · venue_area`)  
- Area in bold/emphasized inline next to venue name
- City on its own small line below
- **Start time in large text** (e.g. `text-lg font-bold` or `text-xl`)
- "Starts at" as a tiny label above the big time
- "Ends at" remains small
- Map link below

```tsx
// New Venue card body
<div key="venue" className="border border-amber-200 rounded-lg p-2.5 bg-amber-50/50 min-w-[160px]">
  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide mb-1.5">📍 Venue</div>
  
  {/* Venue name + Area on same line */}
  <div className="flex items-baseline gap-1.5 flex-wrap">
    {eventDetail?.venue_name && (
      <span className="text-xs font-semibold text-gray-800">{eventDetail.venue_name}</span>
    )}
    {eventDetail?.venue_area && (
      <span className="text-xs font-black text-amber-800 uppercase tracking-wide">· {eventDetail.venue_area}</span>
    )}
  </div>

  {/* City small */}
  {eventDetail?.venue_city && (
    <p className="text-[10px] text-gray-500 mt-0.5">{eventDetail.venue_city}</p>
  )}

  {/* Start time BIG */}
  {eventDetail?.event_start_time && (
    <div className="mt-1.5">
      <p className="text-[9px] text-gray-400 uppercase tracking-wide">Starts at</p>
      <p className="text-base font-black text-violet-700 leading-tight">{eventDetail.event_start_time}</p>
    </div>
  )}

  {/* End time small */}
  {eventDetail?.event_end_time && (
    <p className="text-[10px] text-gray-400 mt-0.5">Ends at {eventDetail.event_end_time}</p>
  )}

  {eventDetail?.venue_map && (
    <a href={eventDetail.venue_map} target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-600 hover:underline mt-1 block">Map →</a>
  )}
</div>
```

Same treatment for Parlour card (area + parlour_start_time big).

---

## Files Changed

### `src/components/suite/AllClientsCrewTable.tsx`

**1. Convert `EventLogisticsPanel` to a component with state** (add `useState` for `calendarOpenFor`)

**2. Add `CrewScheduleEventSheet` import** — it's already imported in `FreelancerAssignmentSection.tsx`. Need to add it to AllClientsCrewTable.tsx imports (line 1 area). Also import `Calendar` from lucide-react (may already be there — check: it IS at line 2 in AllClientsCrewTable).

**3. Modify `EventLogisticsPanel`:**
- Add `const [calendarFor, setCalendarFor] = useState<string | null>(null);` 
- Remove the separate "Crew" section at bottom (lines 1114–1158)
- Inline crew cards into the `cards[]` array (with role badge, name, note, calendar button)
- Fix venue card: area inline with name (bold uppercase), start time large
- Fix parlour card same way
- Add `<CrewScheduleEventSheet>` at end of JSX, rendered when `calendarFor` is set
- Map `row` → `AssignmentRow` and `eventDetail` → `EventDetail` for the sheet

**4. `Calendar` icon** — already imported in AllClientsCrewTable imports (line 2 shows `Calendar`). ✓

**No other files need changes.**

---

## Technical Notes

- `CrewScheduleEventSheet` is already imported at line 20 of AllClientsCrewTable.tsx
- The sheet handles its own visibility settings — when opened with `freelancerName`, it fetches the `freelancer_event_settings` internally via its own `useEffect` (inside `CrewScheduleEventSheet.tsx`). This means the popup will correctly show ONLY what that specific freelancer has been configured to see.
- The `eventDetail` from `event_details_cache` needs to be shaped into `EventDetail` type. We map the raw cache row to an object with the fields `CrewScheduleEventSheet` needs (venue fields, parlour fields, times). We can cast it as `any` or create a simple mapping.
- The `calendarFor` state tracks which freelancer's name was clicked; the panel renders a single shared `CrewScheduleEventSheet` instance that changes based on `freelancerName` prop.
- No new files, no schema changes.
