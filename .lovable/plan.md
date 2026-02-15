
# Enhanced Freelancer Schedule Page

## Overview
Transform the `/crew-schedule/:freelancerName` page from a minimal calendar-only view into a comprehensive event information hub with three sections: Today's Date Header, Booking Calendar with expandable event details, and an Upcoming Events list.

## Current State
- Calendar shows booked dates with emerald dots
- Clicking a date shows only event name (e.g., "BRIDES MEHNDI")
- No venue, parlour, bride/groom, or timing details
- No separation between past and upcoming events
- No today's date display (BS + AD)

## Proposed Changes

### 1. Today's Date Header (New Section)
- Display today's Nepali date prominently: "11 Falgun 2082"
- Below it, show the English date: "February 15, 2026"
- Styled as a subtle pill/badge at the top of the page, below the greeting

### 2. Calendar Improvements
- **Past dates faded**: Days before today get `opacity-40` styling but number remains visible
- Past booked dates get a muted emerald tint instead of the bright one
- Today's date ring stays prominent

### 3. Expanded Event Details on Date Click
Currently shows just the event name. Now show a full expandable card per event with:

**Event Header** (always visible):
- Day + Month name + Event name (e.g., "24 Magh -- BRIDES MEHNDI")
- Client name badge

**Expandable Sections** (tap to expand, using Collapsible):

a) **Bride and Groom Details**
   - Bride: Full name, contact, WhatsApp (clickable), city, area
   - Groom: Full name, contact, WhatsApp (clickable), city, area
   - Color-coded: Rose for bride, Sky for groom

b) **Venue Details**
   - Venue type, name, city, area
   - Event timing (start - end)
   - Map link (clickable icon)

c) **Parlour Details**
   - Parlour type, name, city, area
   - Parlour timing (start - end)
   - Map link (clickable icon)

### 4. Upcoming Events Section (New Section below calendar)
- Header: "Upcoming Events" with count badge
- List all future events (across all months) sorted by date ascending
- Each card shows:
  - Date pill (e.g., "24 Magh 2082")
  - Event name + client name
  - Venue name + city (if available)
  - Tap to expand for full details (same as calendar detail)

### Data Fetching Strategy
The `freelancer_assignments` table has `registered_date_time_ad` and `client_name` for each event. To get venue/parlour/contact details:

1. **Fetch assignments** (existing) from `freelancer_assignments` table -- gives us event names, dates, client names, and `registered_date_time_ad`
2. **Fetch event details** per unique `registered_date_time_ad` via the `google-sheets` edge function with action `getClientEventDetails` -- gives venue, parlour, timing
3. **Fetch contact details** per unique `registered_date_time_ad` via `getClientContactDetails` -- gives bride/groom info
4. Cache by `registeredDateTimeAD` to avoid re-fetching for the same client across events

To keep the page fast, details are fetched lazily -- only when a date is clicked or the upcoming section loads. A loading spinner shows while fetching.

## Technical Changes

### `src/pages/CrewSchedule.tsx` (Major rewrite)
- Add today's BS + AD date display at the top
- Add `opacity-40` to past day cells (keep number visible)
- Expand the selected day detail section into rich event cards with collapsible sub-sections
- Add new state: `eventDetailsCache` (Map of registeredDateTimeAD to EventDetail[]) and `contactDetailsCache` (Map of registeredDateTimeAD to ClientContactDetails)
- Add `fetchEventDetailsForClient(registeredDateTimeAD)` function that calls the edge function and caches results
- Add `fetchContactDetailsForClient(registeredDateTimeAD)` function
- When a date is clicked, fetch details for all unique `registeredDateTimeAD` values in that day's events
- Add "Upcoming Events" section below the calendar that lists all future assignments sorted by date
- Each event card uses `Collapsible` from radix for expand/collapse behavior

### Visual Design
- Past calendar dates: `opacity-40 text-white/20` (numbers still visible)
- Past booked dates: `bg-emerald-500/10 text-emerald-800/40` (muted green)
- Event detail cards: `bg-white/10 backdrop-blur rounded-xl` with colored left borders
- Bride section: Rose accent (`border-l-rose-400`)
- Groom section: Sky accent (`border-l-sky-400`)
- Venue section: Amber accent (`border-l-amber-400`)
- Parlour section: Purple accent (`border-l-purple-400`)
- Upcoming events: Separate card section with gradient header
- Map links: Small external-link icons, tappable
- WhatsApp numbers: Green tinted, tappable to open wa.me link
