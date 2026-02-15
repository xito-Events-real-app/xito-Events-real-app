
# Freelancer Schedule -- Tabs on Top + Crew Details + Client Detail Sheet

## Overview
Three major changes:
1. Move the tab bar from bottom to top (above the calendar)
2. Show assigned crew members (PB through FPV) with direct call icons on each event card
3. Add a full-screen client detail sheet when tapping a client name, showing bride/groom details, event demands, references, and all contacts with proper call vs WhatsApp behavior

## Changes

### 1. Move Tab Bar to Top (`src/pages/CrewSchedule.tsx`)
- Remove the fixed bottom tab bar
- Place the two tabs ("Booking Calendar" / "Upcoming Events") directly below the compact 2-row header, above the calendar content
- Same styling (pill buttons with active/inactive states)
- Footer stays at bottom

### 2. Fetch Crew Data for Each Event (`src/pages/CrewSchedule.tsx`)
- Update the Supabase query to also SELECT all 10 role columns: `photographer_bride, photographer_groom, videographer_bride, videographer_groom, extra_photographer, extra_videographer, assistant, iphone_shooter, drone_operator, fpv_operator`
- Update `AssignmentRow` type in `types.ts` to include these fields
- On page mount, fetch the full freelancers list (name + contactNo) via `getFreelancers()` and build a `Map<string, string>` of name-to-phone for quick lookup
- Pass this phone map down to `EventDetailCard`

### 3. Show Crew Section on Event Cards (`src/components/crew-schedule/EventDetailCard.tsx`)
- Add a new "Crew" section (border-l-cyan-400) inside the expanded details
- For each of the 10 role fields, if a name is assigned, show:
  - Role abbreviation badge (PB, PG, VB, VG, EP, EV, Asst, iPhone, Drone, FPV) in a small colored pill
  - Freelancer name
  - Phone icon (blue) that uses `tel:` protocol for direct calling (looked up from freelancerPhones map)
- Only display roles that have an assigned freelancer (skip empty ones)

### 4. Fix Contact vs WhatsApp Behavior (`src/components/crew-schedule/EventDetailCard.tsx`)
- "Contact" number fields use `tel:` protocol (opens phone dialer) -- render with a blue Phone icon
- "WhatsApp" number fields use `openWhatsApp()` (opens wa.me) -- keep green styling
- Update `DetailRow` component to accept `isCall` prop (for `tel:` links) separate from `isPhone` (renamed to `isWhatsApp`)

### 5. Client Detail Sheet (`src/components/crew-schedule/CrewScheduleClientSheet.tsx` -- NEW)
- Full-screen dark sheet (matching page theme) that opens when tapping a client name badge
- Sections:
  - **Bride** (rose border): Full name, contact (tel:), WhatsApp (wa.me), backup numbers with relation labels, Instagram link, home city/area/landmark, home map link
  - **Groom** (sky border): Same structure as bride
  - **Event Demands** (cyan border): List of demands from `eventDetails`
  - **Event References** (pink border): List of references from `eventDetails`
  - **Venue Details** (amber border): Type, name, location, timing, map
  - **Parlour Details** (purple border): Same structure as venue
- Uses existing cached data (contactDetailsCache + eventDetailsCache) -- no extra API calls
- Close button at top right

### 6. Update Types (`src/components/crew-schedule/types.ts`)
- Add all 10 role columns to `AssignmentRow`:
```
photographer_bride?: string | null
photographer_groom?: string | null
videographer_bride?: string | null
videographer_groom?: string | null
extra_photographer?: string | null
extra_videographer?: string | null
assistant?: string | null
iphone_shooter?: string | null
drone_operator?: string | null
fpv_operator?: string | null
```

## Files Modified
- `src/components/crew-schedule/types.ts` -- add role columns to AssignmentRow
- `src/pages/CrewSchedule.tsx` -- move tabs to top, fetch role columns + freelancers list, pass phone map
- `src/components/crew-schedule/EventDetailCard.tsx` -- add crew section, fix call vs WhatsApp, make client name tappable
- `src/components/crew-schedule/UpcomingEventsSection.tsx` -- pass through new props (freelancerPhones)

## Files Created
- `src/components/crew-schedule/CrewScheduleClientSheet.tsx` -- full client detail overlay
