

# Redesign Freelancer Assignment Section with Visibility Toggles and Personal Notes

## Overview

Redesign the Freelancer Assignments section on the Client Detail page to show a cleaner layout with:
- Event name and date as the header for each event card
- Each assigned freelancer listed below with their role code and name
- Visibility toggle switches (Bride Details, Groom Details, Venue Details, Parlour Details) next to each freelancer
- An "Add Note" button per freelancer to save personal event notes
- All toggles default to ON; toggling OFF hides that section from the freelancer's calendar/app view
- The existing dropdown assignment functionality stays intact

## How It Works

For each event under a client:
1. **Header**: Event name + date displayed prominently
2. **Freelancer rows**: Each assigned freelancer appears as a row with:
   - Role badge (PB, VB, etc.) + freelancer name
   - 4 toggle switches: Bride Details | Groom Details | Venue Details | Parlour Details
   - "Add Note" button that opens a text input to write a personal note for that freelancer on that event
3. All toggles start ON. When toggled OFF, the corresponding section is hidden from the freelancer's crew schedule event detail sheet
4. Notes are saved per freelancer per event in the database

## Database Changes

### New Table: `freelancer_event_settings`

Stores per-freelancer, per-event visibility toggles and personal notes.

```sql
CREATE TABLE public.freelancer_event_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registered_date_time_ad text NOT NULL,
  event_name text NOT NULL,
  freelancer_name text NOT NULL,
  role_code text NOT NULL DEFAULT '',
  show_bride_details boolean NOT NULL DEFAULT true,
  show_groom_details boolean NOT NULL DEFAULT true,
  show_venue_details boolean NOT NULL DEFAULT true,
  show_parlour_details boolean NOT NULL DEFAULT true,
  personal_note text DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(registered_date_time_ad, event_name, freelancer_name)
);

ALTER TABLE public.freelancer_event_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to freelancer_event_settings"
  ON public.freelancer_event_settings FOR ALL
  USING (true) WITH CHECK (true);
```

This uses a composite unique key (client + event + freelancer) so each freelancer gets exactly one settings record per event.

## UI Changes

### File: `src/components/client-detail/FreelancerAssignmentSection.tsx`

Complete redesign of the `EventAssignmentCard` component:

**Current layout**: Grid of role dropdowns (2 columns)
**New layout**: 
- Keep the event header (event name + date + assigned count)
- Below header: list of assigned freelancers as rows
- Each row: `[PB] Nikit KC` followed by 4 small toggle switches + Add Note button
- Below the assigned list: the existing dropdown grid for unassigned roles (so users can still assign new freelancers)

```
+--------------------------------------------------+
| RECEPTION        3/10 assigned    2082-11-15      |
+--------------------------------------------------+
| PB  Nikit KC    [Bride][Groom][Venue][Parlour] +Note |
| VB  Ram Sharma  [Bride][Groom][Venue][Parlour] +Note |
| Asst Hari KC    [Bride][Groom][Venue][Parlour] +Note |
+--------------------------------------------------+
| [Assign PG...] [Assign VG...] ...                |
+--------------------------------------------------+
```

Toggle switches use the Switch component, sized small. All ON by default. Changes save immediately to Supabase `freelancer_event_settings` table.

"Add Note" opens an inline collapsible text area or a small dialog. The note is saved per freelancer per event.

### File: `src/pages/CrewSchedule.tsx` and `src/components/crew-schedule/CrewScheduleEventSheet.tsx`

When displaying event details to a freelancer:
1. Fetch the `freelancer_event_settings` record for the current freelancer + event
2. If `show_bride_details` is false, hide the Bride section
3. If `show_groom_details` is false, hide the Groom section
4. If `show_venue_details` is false, hide the Venue section
5. If `show_parlour_details` is false, hide the Parlour section
6. If a `personal_note` exists, display it prominently in the event detail sheet

## Technical Details

### Data Flow

1. **Client Detail Page (admin view)**: 
   - On load, fetch `freelancer_event_settings` for all freelancers assigned to this client's events
   - When a toggle changes, upsert the record in Supabase immediately
   - When a note is saved, upsert the record

2. **Crew Schedule Page (freelancer view)**:
   - When opening "Full Details" sheet, also fetch the freelancer's settings for this event
   - Conditionally render Bride/Groom/Venue/Parlour sections based on the boolean flags
   - Show personal note if present

### Files to Create/Modify

| File | Action |
|------|--------|
| Database migration | Create `freelancer_event_settings` table |
| `src/components/client-detail/FreelancerAssignmentSection.tsx` | Redesign to show assigned freelancers as rows with toggles + notes |
| `src/components/crew-schedule/CrewScheduleEventSheet.tsx` | Read visibility settings and conditionally hide sections; show personal notes |
| `src/pages/CrewSchedule.tsx` | Fetch freelancer settings alongside event details |

### Key Implementation Notes

- Toggles use the existing `Switch` component (`@/components/ui/switch`) with small sizing
- Note input uses a `Textarea` that appears inline when "Add Note" is clicked
- All Supabase reads/writes go directly via the `supabase` client (no edge function needed since the table has open RLS)
- The unassigned role dropdowns remain below the assigned freelancer list so the assignment workflow is unchanged
- Settings are loaded once per client and cached in component state

