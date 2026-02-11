
# Show Assigned Freelancers on Dashboard Event Details

## What Changes

Add a **third column** to the Event Details section on the Client Dashboard that shows which freelancers are assigned for each event. This will display compact role-name pairs (e.g., "PB: Ram Sharma", "VB: Hari KC") so you can see the crew at a glance.

## Visual Layout

```text
Current (2 columns):
| MAGH 15       | Venue: Hotel ABC, Kathmandu  10:00 AM |
| Wedding       | Parlour: XYZ Beauty, Patan            |

New (3 columns):
| MAGH 15       | Venue: Hotel ABC, Kathmandu  10:00 AM | PB: Ram Sharma    |
| Wedding       | Parlour: XYZ Beauty, Patan            | VB: Hari KC       |
|               |                                       | Asst: Shyam Thapa |
```

Freelancer roles will be color-coded to match the assignment section (Amber for Photographers, Purple for Videographers, Emerald for Assistants, etc.). Only assigned roles will be shown -- empty slots are hidden to keep it clean.

---

## Technical Details

### File 1: `src/components/client-detail/DashboardEventDetails.tsx`

- Add `freelancerAssignments` prop (array of `FreelancerAssignment` objects, optional)
- For each event row, find the matching assignment by event name + date
- Render a third column showing assigned freelancers as compact colored labels
- Role abbreviations: PB (Photographer Bride), PG (Photographer Groom), VB, VG, EP, EV, Asst, iPhone, Drone, FPV

### File 2: `src/components/client-detail/ClientHeroSection.tsx`

- Add `freelancerAssignments` prop to the interface
- Pass it through to `DashboardEventDetails`

### File 3: `src/pages/ClientDetail.tsx`

- Import and use `useFreelancerAssignments` hook (already imported)
- Pass the `assignments` data to `ClientHeroSection` as a new prop
- The hook is already used elsewhere in this page for the Freelancer Assignment tab, so we just need to also pass its data to the dashboard view

### No backend changes needed -- all data is already fetched by the existing `useFreelancerAssignments` hook.
