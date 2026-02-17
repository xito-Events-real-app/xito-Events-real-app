

# Upgrade Freelancer Assignment Section: Granular Switches, Grouping & Highlighting

## Overview

Redesign the Freelancer Assignment section in the Client Detail page with bigger professional switches, granular visibility controls (6 toggles instead of 4), visual grouping of PB/VB and PG/VG, Barun highlighting, and mandatory demand display.

## Database Change

Add 2 new columns to `freelancer_event_settings` to split Bride and Groom toggles into Phone vs Location:

| New Column | Type | Default | Purpose |
|---|---|---|---|
| `show_bride_location` | boolean | true | Controls bride home city, area, landmark, map |
| `show_groom_location` | boolean | true | Controls groom home city, area, landmark, map |

The existing `show_bride_details` will now mean "Bride Phone" (name, contact, whatsapp, backups) and `show_groom_details` will mean "Groom Phone" (same for groom).

## UI Changes in `FreelancerAssignmentSection.tsx`

### 1. Bigger Switches
Replace the tiny `h-4 w-7` switches with `h-6 w-11` (default Switch size). Each toggle gets an icon instead of text label:
- Bride Phone: Phone icon (rose color)
- Bride Location: MapPin icon (rose color)
- Groom Phone: Phone icon (sky color)
- Groom Location: MapPin icon (sky color)
- Venue: Building icon (amber color)
- Parlour: Scissors icon (purple color)

### 2. PB/VB and PG/VG Grouping
The assigned freelancers list will be reorganized:
- PB and VB inside a bordered box labeled "Bride Side"
- PG and VG inside a bordered box labeled "Groom Side"
- EP, EV, Asst, iPhone, Drone, FPV remain as individual rows below

### 3. Barun Highlighting
When a freelancer's name matches "Barun" (case-insensitive), their row gets a distinct light-blue background and a subtle border glow to indicate "this is you".

### 4. Demand is Mandatory
Event demands from the event details will be fetched and displayed prominently at the top of each event card, always visible regardless of any toggle state.

## Changes to Crew Schedule (Public Freelancer View)

Update `CrewScheduleEventSheet.tsx` to respect the 2 new granular toggles:
- `show_bride_details` = true: show bride name, contact, whatsapp, backups
- `show_bride_location` = true: show bride city, area, landmark, map
- Same split for groom

## Files Modified

| File | Change |
|---|---|
| DB Migration | Add `show_bride_location` and `show_groom_location` columns |
| `src/components/client-detail/FreelancerAssignmentSection.tsx` | Bigger switches with icons, 6 toggles, PB/VB + PG/VG grouping, Barun highlight, demand display |
| `src/components/crew-schedule/CrewScheduleEventSheet.tsx` | Respect new granular bride/groom location toggles |

## Technical Details

### Switch Size
The `VisibilityToggle` component will use the default Switch dimensions (`h-6 w-11`) with an icon label beside it instead of text. Each toggle rendered as:
```
[PhoneIcon] [====SWITCH====]   [MapPinIcon] [====SWITCH====]
```

### Grouping Layout
```
+--- Bride Side --------------------------------+
| PB: Ram Sharma     [switches...]              |
| VB: Hari KC        [switches...]              |
+-----------------------------------------------+

+--- Groom Side --------------------------------+
| PG: Sita Devi      [switches...]              |
| VG: Bikash Thapa   [switches...]              |
+-----------------------------------------------+

EP: Someone          [switches...]
Asst: Barun          [switches...] <-- highlighted
Drone: Pilot Name    [switches...]
```

### Demand Section
Each event card will show demands at the top in a mandatory, non-toggleable section with colored badges, pulled from existing event details data (passed as a new prop or fetched inline).

### Toggle-to-Data Mapping

| Toggle | Icon | Data Controlled |
|---|---|---|
| Bride Phone | Phone (rose) | brideFullName, brideContactNumber, brideWhatsappNumber, brideBackupNumber, brideBackupRelation, brideBackupNumber2, brideBackupRelation2 |
| Bride Location | MapPin (rose) | brideHomeCity, brideHomeArea, brideHomeLandmark, brideHomeMap |
| Groom Phone | Phone (sky) | groomFullName, groomContactNumber, groomWhatsappNumber, groomBackupNumber, groomBackupRelation, groomBackupNumber2, groomBackupRelation2 |
| Groom Location | MapPin (sky) | groomHomeCity, groomHomeArea, groomHomeLandmark, groomHomeMap |
| Venue | Building (amber) | venueName, venueType, venueCity, venueArea, venueMap, eventStartTime, eventEndTime |
| Parlour | Scissors (purple) | parlourName, parlourType, parlourCity, parlourArea, parlourMap, parlourStartTime, parlourEndTime |

