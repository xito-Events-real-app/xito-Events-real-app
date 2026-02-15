

# Event Detail Sheet -- Add Bride/Groom Details, Remove Groom Mehndi

## Changes to `src/components/crew-schedule/CrewScheduleEventSheet.tsx`

### Remove
- Remove "Groom comes in Mehndi" row entirely

### Add Bride and Groom Sections
Include the same bride/groom contact details already shown in the Client Detail Sheet:

- **Bride** (rose border): Full name, Contact (tel:), WhatsApp (wa.me), backup numbers with relation labels, Instagram, home city/area/landmark, map link
- **Groom** (sky border): Same structure

### Updated Sheet Layout
```text
+--------------------------------------------+
| [Event Name]                    [X Close]  |
| 15 Falgun 2082 -- Client Name              |
+--------------------------------------------+
| CREW (cyan)                                |
|   PB: Name [phone] ...                     |
+--------------------------------------------+
| BRIDE (rose)                               |
|   Name | Contact | WhatsApp | Backup       |
|   Instagram | Location | Map               |
+--------------------------------------------+
| GROOM (sky)                                |
|   Name | Contact | WhatsApp | Backup       |
|   Instagram | Location | Map               |
+--------------------------------------------+
| VENUE (amber)                              |
|   Type | Name | Location | Time | Map      |
+--------------------------------------------+
| PARLOUR (purple)                           |
|   Type | Name | Location | Time | Map      |
+--------------------------------------------+
| DEMANDS (cyan)                             |
|   [pill] [pill] [pill]                     |
+--------------------------------------------+
| REFERENCES (pink)                          |
|   [pill] [pill]                            |
+--------------------------------------------+
| GUEST COUNT: 500                           |
+--------------------------------------------+
```

### Props Update
The `CrewScheduleEventSheet` needs to also accept `contactDetails` (ClientContactDetails) so it can render bride/groom info. This prop will be passed from `EventDetailCard.tsx` which already has access to it.

### Technical Details

**`src/components/crew-schedule/CrewScheduleEventSheet.tsx`**
- Add `contactDetails?: ClientContactDetails | null` to props
- Add Bride section using PersonSection-style layout (reuse pattern from CrewScheduleClientSheet): name, contact (tel:), WhatsApp (wa.me), backup numbers with relation labels, Instagram link, city/area/landmark, map
- Add Groom section with identical structure
- Remove the "Groom comes in Mehndi" row
- Keep: Crew, Venue, Parlour, Demands, References, Guest Count

**`src/components/crew-schedule/EventDetailCard.tsx`**
- Pass `contactDetails` prop through to `CrewScheduleEventSheet`

### Files Modified
- `src/components/crew-schedule/CrewScheduleEventSheet.tsx` -- add bride/groom sections, remove mehndi row
- `src/components/crew-schedule/EventDetailCard.tsx` -- pass contactDetails to event sheet

