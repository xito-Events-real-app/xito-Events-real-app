
# Three Enhancements to the Expanded Row Panel

## What Changes

### 1. Venue Card — Area in Bold + "Starts at (time)" 
### 2. Freelancer Names in Expanded Row — Personal Note Below Each Name
### 3. Freelancer Booking Calendar Link — Button to Open Their Crew Schedule

---

## Current State Analysis

**`EventLogisticsPanel`** lives at lines 965–1103 in `AllClientsCrewTable.tsx`.

**Current Venue card (lines 1059–1077):**
```tsx
{eventDetail?.venue_name && <p className="text-xs font-semibold text-gray-800 truncate">{eventDetail.venue_name}</p>}
{(eventDetail?.venue_city || eventDetail?.venue_area) && (
  <p className="flex items-center gap-1 text-xs text-gray-600 mt-0.5">
    <MapPin className="w-2.5 h-2.5 shrink-0" />{[eventDetail.venue_city, eventDetail.venue_area].filter(Boolean).join(', ')}
  </p>
)}
{(eventDetail?.event_start_time || eventDetail?.event_end_time) && (
  <p className="text-xs text-gray-500 mt-0.5">⏰ {[eventDetail.event_start_time, eventDetail.event_end_time].filter(Boolean).join(' – ')}</p>
)}
```

**Current `toggleExpand` query for `freelancer_event_settings` (lines 170–173):**
```typescript
supabase.from('freelancer_event_settings')
  .select('show_bride_details,show_groom_details,show_venue_details,show_parlour_details,show_bride_location,show_groom_location')
  .eq('registered_date_time_ad', row.registeredDateTimeAD)
  .eq('event_name', row.event),
```

Missing: `freelancer_name`, `role_code`, `personal_note` — needed for the new freelancer notes section.

**Current `EventLogisticsPanel` signature (line 966):**
```typescript
function EventLogisticsPanel({ eventDetail, contactDetail, settings, loading }: { ... })
```

Missing: `row` (the FreelancerAssignment) — needed to iterate over assigned freelancer names and match them to their settings.

---

## Change 1: Fix Venue Card Layout

**Before:**
- Venue name
- MapPin + city, area (comma-joined)
- ⏰ start – end time

**After (user requested):**
- Venue name
- **AREA** in bold (on its own line)
- Starts at `(venue_start_time)` immediately below area

The area should be displayed in bold on its own line. The city can be smaller/secondary. Then "Starts at 8:00 AM" below it.

**New venue card body:**
```tsx
{eventDetail?.venue_name && (
  <p className="text-xs font-semibold text-gray-800 truncate">{eventDetail.venue_name}</p>
)}
{eventDetail?.venue_city && (
  <p className="text-[10px] text-gray-500 mt-0.5">{eventDetail.venue_city}</p>
)}
{eventDetail?.venue_area && (
  <p className="text-xs font-bold text-gray-800 mt-0.5">{eventDetail.venue_area}</p>
)}
{eventDetail?.event_start_time && (
  <p className="text-[10px] text-violet-600 mt-0.5">Starts at {eventDetail.event_start_time}</p>
)}
{eventDetail?.event_end_time && (
  <p className="text-[10px] text-gray-400">Ends at {eventDetail.event_end_time}</p>
)}
{eventDetail?.venue_map && (
  <a href={eventDetail.venue_map} target="_blank" rel="noopener noreferrer" className="text-[10px] text-violet-600 hover:underline mt-0.5 block">Map →</a>
)}
```

Same treatment for the **Parlour card** — area in bold, then "Starts at (parlour_start_time)".

---

## Change 2: Freelancer Personal Notes in Expanded Row

### Step A — Expand the Supabase Query

In `toggleExpand` (line 170–173), add `freelancer_name`, `role_code`, `personal_note` to the select:

```typescript
supabase.from('freelancer_event_settings')
  .select('show_bride_details,show_groom_details,show_venue_details,show_parlour_details,show_bride_location,show_groom_location,freelancer_name,role_code,personal_note')
  .eq('registered_date_time_ad', row.registeredDateTimeAD)
  .eq('event_name', row.event),
```

### Step B — Pass `row` to `EventLogisticsPanel`

At both call sites (mobile line 756, desktop line 925), pass `row`:
```tsx
<EventLogisticsPanel
  eventDetail={cached?.eventDetail ?? null}
  contactDetail={cached?.contactDetail ?? null}
  settings={cached?.settings ?? []}
  loading={cached?.loading ?? true}
  row={row}  // ← ADD THIS
/>
```

### Step C — Add `row` to `EventLogisticsPanel` Props

Update the function signature:
```typescript
function EventLogisticsPanel({ eventDetail, contactDetail, settings, loading, row }: {
  eventDetail: any | null;
  contactDetail: any | null;
  settings: any[];
  loading: boolean;
  row: FreelancerAssignment;
})
```

### Step D — Render Freelancer Notes Section

After the existing cards grid, add a new "Crew Notes" section. It iterates over all `CREW_COLUMNS`, finds assigned names, looks them up in `settings` by `freelancer_name`, and if there's a `personal_note`, shows it:

```tsx
{/* Crew Personal Notes */}
{(() => {
  const notedCrew: { name: string; role: string; note: string }[] = [];
  for (const col of CREW_COLUMNS) {
    const name = (row[col.field] as string)?.trim();
    if (!name) continue;
    const setting = settings.find(s => 
      s.freelancer_name?.trim().toLowerCase() === name.toLowerCase()
    );
    if (setting?.personal_note?.trim()) {
      notedCrew.push({ name, role: col.short, note: setting.personal_note.trim() });
    }
  }
  if (notedCrew.length === 0) return null;
  return (
    <div className="mt-2.5 pt-2.5 border-t border-gray-200">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">📝 Crew Notes</p>
      <div className="flex flex-wrap gap-2">
        {notedCrew.map(({ name, role, note }) => (
          <div key={name} className="bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1.5 max-w-[240px]">
            <p className="text-[10px] font-bold text-gray-700">{name} <span className="text-gray-400 font-normal">({role})</span></p>
            <p className="text-[10px] text-gray-600 mt-0.5 leading-relaxed whitespace-pre-line">{note}</p>
          </div>
        ))}
      </div>
    </div>
  );
})()}
```

---

## Change 3: Booking Calendar Button Per Freelancer

Under each freelancer note card (or even for freelancers without notes), add a small "📅 View Calendar" button that navigates to `/crew-schedule/:freelancerName`.

The button is added inside each crew note card:
```tsx
<div key={name} className="bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1.5 max-w-[240px]">
  <div className="flex items-center justify-between gap-2">
    <p className="text-[10px] font-bold text-gray-700">{name} <span className="text-gray-400 font-normal">({role})</span></p>
    <a
      href={`/crew-schedule/${encodeURIComponent(name)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 text-[9px] text-violet-600 hover:underline flex items-center gap-0.5"
      title={`Open ${name}'s booking calendar`}
    >
      <ExternalLink className="w-2.5 h-2.5" /> Cal
    </a>
  </div>
  {note && <p className="text-[10px] text-gray-600 mt-0.5 leading-relaxed whitespace-pre-line">{note}</p>}
</div>
```

For freelancers **without** a personal note but who are assigned, we still show the calendar link. So the section loops over ALL assigned crew (not just those with notes) and shows:
- Name + role code
- Personal note (if any)
- Calendar link

This means splitting the rendering: a "Crew" section at the bottom of the expanded panel listing all assigned people with optional notes and calendar links.

**Final Crew section (replaces the "notedCrew only" approach):**

```tsx
{/* All Assigned Crew — Notes + Calendar links */}
{(() => {
  const assignedCrew: { name: string; role: string; shortCode: string; note: string }[] = [];
  for (const col of CREW_COLUMNS) {
    const name = (row[col.field] as string)?.trim();
    if (!name) continue;
    const setting = settings.find(s =>
      s.freelancer_name?.trim().toLowerCase() === name.toLowerCase()
    );
    assignedCrew.push({ name, role: col.label, shortCode: col.short, note: setting?.personal_note?.trim() || '' });
  }
  if (assignedCrew.length === 0) return null;
  return (
    <div className="mt-2.5 pt-2.5 border-t border-gray-200">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">👥 Crew</p>
      <div className="flex flex-wrap gap-2">
        {assignedCrew.map(({ name, shortCode, note }) => (
          <div key={`${name}-${shortCode}`} className="bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 min-w-[130px] max-w-[220px]">
            <div className="flex items-center justify-between gap-1">
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-gray-500 uppercase">{shortCode}</span>
                <p className="text-xs font-semibold text-gray-800 truncate">{name}</p>
              </div>
              <a
                href={`/crew-schedule/${encodeURIComponent(name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1 rounded hover:bg-violet-100 text-violet-400 hover:text-violet-600 transition-colors"
                title={`Open ${name}'s booking calendar`}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            {note && (
              <p className="text-[10px] text-amber-700 bg-yellow-50 rounded px-1.5 py-0.5 mt-1 leading-relaxed whitespace-pre-line border border-yellow-100">{note}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
})()}
```

---

## Summary of All File Changes

**File: `src/components/suite/AllClientsCrewTable.tsx`**

### 1. `toggleExpand` (line 170–173) — Add missing fields to settings query
Change `.select('show_bride_details,...,show_groom_location')` to also include `freelancer_name,role_code,personal_note`.

### 2. `EventLogisticsPanel` call sites (lines 756, 925) — Pass `row` prop
Add `row={row}` at both the mobile and desktop call sites.

### 3. `EventLogisticsPanel` function (line 966) — 3 sub-changes:
- **a.** Add `row: FreelancerAssignment` to props type
- **b.** Venue card: display `venue_area` in bold on its own line, then `Starts at (time)` and `Ends at (time)` below it (same for Parlour card)  
- **c.** After the cards grid (line 1100), add the "Crew" section that lists all assigned freelancers with their personal note and a calendar link button

No schema changes. No new files. No other component files touched.
