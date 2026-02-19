
# Expand Button on Date Circle — Inline Row Below Selected Row

## What the User Wants

Clicking the expand button on a date in the Day column should open an **inline details panel immediately below that specific row** in the desktop table (and below the card on mobile). This panel shows event logistics — bride/groom contacts, venue, parlour — based on what visibility settings have been configured for that event's freelancers.

---

## Current Day Cell (lines 743–756)

```tsx
<td className="px-3 py-2 border-r border-gray-100 text-center">
  <button onClick={() => setFilterDay(...)}>
    {row.eventDay}
  </button>
</td>
```

Currently just a single button for the day filter. No expand button exists yet.

---

## Implementation Plan

### 1. New State Variables

Add to the component state (after line 121):

```typescript
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
const [expandCache, setExpandCache] = useState<Map<string, {
  eventDetail: any | null;
  contactDetail: any | null;
  settings: any[];
  loading: boolean;
}>>(new Map());
```

### 2. New `toggleExpand` Function

```typescript
const toggleExpand = useCallback(async (rowKey: string, row: FreelancerAssignment) => {
  setExpandedRows(prev => {
    const next = new Set(prev);
    if (next.has(rowKey)) { next.delete(rowKey); return next; }
    next.add(rowKey);
    return next;
  });

  // Only fetch if not already in cache
  const cacheKey = `${row.registeredDateTimeAD}__${row.event}`;
  if (expandCache.has(cacheKey)) return;

  // Mark loading
  setExpandCache(prev => new Map(prev).set(cacheKey, { eventDetail: null, contactDetail: null, settings: [], loading: true }));

  const [edRes, cdRes, settingsRes] = await Promise.all([
    supabase.from('event_details_cache')
      .select('venue_name,venue_type,venue_city,venue_area,venue_map,parlour_name,parlour_type,parlour_city,parlour_area,parlour_map,event_start_time,event_end_time,parlour_start_time,parlour_end_time')
      .eq('registered_date_time_ad', row.registeredDateTimeAD)
      .ilike('event_name', row.event)
      .maybeSingle(),
    supabase.from('contact_details_cache')
      .select('bride_full_name,bride_contact_number,bride_whatsapp_number,bride_home_city,bride_home_area,bride_home_map,groom_full_name,groom_contact_number,groom_whatsapp_number,groom_home_city,groom_home_area,groom_home_map')
      .eq('registered_date_time_ad', row.registeredDateTimeAD)
      .maybeSingle(),
    supabase.from('freelancer_event_settings')
      .select('show_bride_details,show_groom_details,show_venue_details,show_parlour_details,show_bride_location,show_groom_location')
      .eq('registered_date_time_ad', row.registeredDateTimeAD)
      .eq('event_name', row.event),
  ]);

  setExpandCache(prev => new Map(prev).set(cacheKey, {
    eventDetail: edRes.data || null,
    contactDetail: cdRes.data || null,
    settings: settingsRes.data || [],
    loading: false,
  }));
}, [expandCache]);
```

### 3. New `EventLogisticsPanel` Component

Defined inside the file. Aggregates visibility via OR logic across all freelancer settings for the event:

```typescript
function EventLogisticsPanel({ eventDetail, contactDetail, settings, loading }: {
  eventDetail: any | null;
  contactDetail: any | null;
  settings: any[];
  loading: boolean;
}) {
  if (loading) return <div className="flex items-center gap-2 py-2 px-3 text-xs text-gray-400"><Loader2 className="w-3 h-3 animate-spin" /> Loading details...</div>;

  const showBride = settings.some(s => s.show_bride_details);
  const showBrideLocation = settings.some(s => s.show_bride_location);
  const showGroom = settings.some(s => s.show_groom_details);
  const showGroomLocation = settings.some(s => s.show_groom_location);
  const showVenue = settings.some(s => s.show_venue_details);
  const showParlour = settings.some(s => s.show_parlour_details);

  // If nothing is visible at all, show a message
  const hasAnything = showBride || showGroom || showVenue || showParlour || showBrideLocation || showGroomLocation;

  // Render sections in a compact horizontal/vertical grid
  // Each section: label chip + data rows
}
```

**Layout:** Horizontal grid of cards inside the expanded row — Bride card | Groom card | Venue card | Parlour card. Only renders cards where visibility is true. If no settings exist yet, shows a soft "No details configured for freelancers yet" message.

### 4. Desktop Table Row Change

The core change: each event row becomes **two `<tr>` elements**. The `filteredRows.map(...)` currently returns a single `<tr>` (lines 738–840). It becomes:

```tsx
filteredRows.map((row, idx) => {
  const rowKey = `${row.registeredDateTimeAD}-${row.event}-${row.eventDateAD}`;
  const cacheKey = `${row.registeredDateTimeAD}__${row.event}`;
  const isExpanded = expandedRows.has(rowKey);
  const cached = expandCache.get(cacheKey);
  // ... existing groupIdx, dayBg, reqCodes, hasUnassignedRequired

  return (
    <>
      {/* Existing main row — with expand icon added to Day cell */}
      <tr key={`main-${rowKey}-${idx}`} ...>
        <td className="px-3 py-2 border-r border-gray-100 text-center">
          {/* Existing day filter button */}
          <button onClick={() => setFilterDay(...)}>
            {row.eventDay}
          </button>
          {/* NEW: Expand toggle below day circle */}
          <button
            onClick={() => toggleExpand(rowKey, row)}
            className="mt-0.5 flex items-center justify-center w-full text-gray-300 hover:text-violet-500 transition-colors"
            title={isExpanded ? "Collapse details" : "Expand details"}
          >
            {isExpanded
              ? <ChevronUp className="w-3 h-3" />
              : <ChevronDown className="w-3 h-3" />}
          </button>
        </td>
        {/* ... all other existing cells unchanged ... */}
      </tr>

      {/* NEW: Expand panel row */}
      {isExpanded && (
        <tr key={`expand-${rowKey}-${idx}`} className="bg-slate-50 border-b border-violet-100">
          <td colSpan={13} className="px-4 py-3">
            <EventLogisticsPanel
              eventDetail={cached?.eventDetail ?? null}
              contactDetail={cached?.contactDetail ?? null}
              settings={cached?.settings ?? []}
              loading={cached?.loading ?? true}
            />
          </td>
        </tr>
      )}
    </>
  );
})
```

**Important:** Wrap the fragment pairs in `<React.Fragment key={...}>` to avoid React key warnings.

### 5. Imports to Add

Add to the lucide-react import on line 8:
- `ChevronDown`
- `ChevronUp`
- `Phone`
- `MapPin`
- `ExternalLink`

---

## `EventLogisticsPanel` UI Design

Compact inline section — horizontal cards side by side, dark-outlined boxes:

```
┌─────────────────┬─────────────────┬────────────────┬──────────────┐
│ 🌸 BRIDE        │ 🤵 GROOM        │ 📍 VENUE       │ 💄 PARLOUR   │
│ Sita Sharma     │ Ram Sharma      │ Taj Hall       │ Beauty Queen │
│ 📞 9800000000   │ 📞 9811111111   │ Baneshwor      │ New Baneshwor│
│ 📍 Lalitpur     │ 📍 Bhaktapur    │ [Map →]        │ [Map →]      │
└─────────────────┴─────────────────┴────────────────┴──────────────┘
```

If `settings` is empty (no freelancers configured) → show:
> "No visibility settings configured for this event's freelancers yet."

If settings exist but all are `false` → show:
> "All details are hidden for this event's freelancers."

Phone numbers are `<a href="tel:...">` links. WhatsApp numbers open WhatsApp. Map links open in new tab.

---

## Mobile — Collapsible Section Below Card

On mobile (the card-based layout), add the same expand chevron at the bottom of each day card header. When expanded, the `EventLogisticsPanel` renders below the crew assignment section inside the card.

---

## Files Changed

### `src/components/suite/AllClientsCrewTable.tsx`

- **New imports:** `ChevronDown`, `ChevronUp`, `Phone`, `MapPin`, `ExternalLink` from lucide-react
- **New state:** `expandedRows: Set<string>`, `expandCache: Map<string, {...}>`
- **New function:** `toggleExpand(rowKey, row)` — lazy fetches from 3 Supabase tables in parallel
- **New component:** `EventLogisticsPanel` — renders bride/groom/venue/parlour based on aggregated visibility settings
- **Desktop table:** Each row becomes a `<React.Fragment>` with 2 `<tr>` elements — existing row + optional expand row
- **Day cell:** Add `ChevronDown`/`ChevronUp` toggle button below the day number circle
- **Mobile:** Add expand toggle to mobile card header + `EventLogisticsPanel` below crew section

No schema changes. No other files.

---

## Technical Notes

- `Promise.all` runs all 3 Supabase queries in parallel — typical load time under 200ms
- `expandCache` uses `registeredDateTimeAD + "__" + event` as key to distinguish multiple events on the same day for the same client
- React keys use `React.Fragment key={rowKey}` to avoid duplicate key warnings from the two `<tr>` siblings
- `colSpan={13}` covers all columns (Day + Client + Event + 10 crew columns)
- The panel is styled `bg-slate-50` to visually distinguish it from the main table row
- `ilike` used for the event detail query to handle case mismatch between Sheets data and stored values
