

# Freelancer Schedule Share Page (WhatsApp Link)

## Overview
Add a "Send to WhatsApp" button inside the freelancer hover card on the All Clients page. When clicked, it generates a shareable link to a **public, mobile-friendly page** that shows the freelancer's booked dates in a calendar view. The data comes from the existing `freelancer_assignments` Supabase table for instant loading.

## How It Works

```text
Hover on freelancer name
  --> See existing info + new "Send to WhatsApp" button
  --> Click button
  --> Opens WhatsApp with pre-filled message containing a link like:
      https://wtnclienttracker.lovable.app/crew-schedule/Safal

Freelancer opens link on phone:
  --> Public page (no login required)
  --> Greeting: "Hi Safal, Good Evening" (time-based)
  --> Interactive Nepali calendar (month nav)
  --> Booked dates highlighted
  --> Stats: Total events this month, remaining this month, total remaining overall
  --> Data fetched from Supabase (fast)
```

## Data Source

The existing `freelancer_assignments` table already has all the data needed. We query it by matching the freelancer's name across all role columns (photographer_bride, photographer_groom, etc.) -- no new tables needed.

## Changes

### 1. New Public Page: `src/pages/CrewSchedule.tsx`
- Route: `/crew-schedule/:freelancerName` (public, no auth)
- Mobile-first responsive design
- Time-based greeting ("Good Morning/Afternoon/Evening")
- Full Nepali calendar with month navigation (back/forth)
- Booked dates shown as highlighted circles (emerald green)
- Stats section:
  - Total events in current month
  - Remaining events this month (future dates only)
  - Total remaining events overall (across all months)
- Reads directly from the `freelancer_assignments` Supabase table
- Tap on a booked date shows the event count for that day

### 2. Update: `src/components/suite/AllClientsCrewTable.tsx`
- Add a "Send to WhatsApp" button inside `FreelancerHoverInfo`
- Button generates the public URL and opens WhatsApp with a pre-filled message:
  "Check your upcoming schedule here: [link]"
- Uses existing `openWhatsApp` utility
- Needs the freelancer's WhatsApp number -- will look it up from the freelancers list (already loaded in the component)

### 3. Update: `src/App.tsx`
- Add the new public route `/crew-schedule/:freelancerName` outside the ProtectedRoute wrapper (like the existing `/client-form/:clientName/:clientId` route)

### 4. No New Database Tables
- All data comes from the existing `freelancer_assignments` table
- Since it already has an open RLS policy (`true`), the public page can read from it directly
- Any updates (adding/removing freelancers) in the system automatically reflect on the shared page since it reads live from Supabase

## Technical Details

### Public Page Component Structure
```text
CrewSchedule.tsx
  |-- Greeting section (time-based: Morning/Afternoon/Evening)
  |-- Stats bar (total month / remaining month / total remaining)
  |-- Calendar grid (Nepali months, navigable)
  |-- Booked date indicators (green dots/highlights)
```

### Supabase Query (in CrewSchedule.tsx)
```typescript
// Fetch all assignments where this freelancer appears in ANY role column
const { data } = await supabase
  .from('freelancer_assignments')
  .select('*')
  .or(`photographer_bride.ilike.%${name}%,photographer_groom.ilike.%${name}%,...all role columns`);
```

### WhatsApp Message Format
```
Hi! Check your upcoming event schedule here:
https://wtnclienttracker.lovable.app/crew-schedule/Safal
```

### Calendar Navigation
- Uses existing Nepali date utilities (`getCurrentBSDate`, `nepaliMonthsEnglish`, `getDaysInBSMonth`)
- Left/right arrows to navigate months
- Current month shown by default
- Booked dates highlighted with emerald background
- Tapping a booked date shows a small tooltip with event count

### Files to Create
- `src/pages/CrewSchedule.tsx` -- the public schedule page

### Files to Modify
- `src/App.tsx` -- add public route
- `src/components/suite/AllClientsCrewTable.tsx` -- add WhatsApp button to hover card

