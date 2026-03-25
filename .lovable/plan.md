

## Fix Available Editors — Per-Row "Ask [FirstName]" Button + Contact Fallback

### Problems
1. Ramesh missing WhatsApp button — `whatsapp_no` is empty, need `contact_no` as fallback
2. EDIT_LAB editors need per-row "Ask [FirstName]" text buttons instead of a single phone icon
3. QUEUE editors already have "Move to Edit Lab" — confirmed working

### Changes — `src/components/video-edit/DesktopVideoEditTracker.tsx`

**1. Editor fetch (line ~849)**: Also select `contact_no` from `freelancers_cache`. Update editor type to include `contactNo?: string`.

```typescript
const { data } = await supabase.from("freelancers_cache")
  .select("name, video_editor, whatsapp_no, contact_no").order("name");
// map: contactNo: f.contact_no || ''
```

**2. Available editors computation (line ~897)**: Use `whatsapp || contactNo` as phone number.

```typescript
const whatsapp = editorInfo?.whatsapp || editorInfo?.contactNo || '';
```

**3. EDIT_LAB card rendering (lines ~434-468)**:
- Remove the single WhatsApp icon button from the card header
- For each task row, add an **"Ask [FirstName]"** green pill button
- First name extracted via `editor.name.split(' ')[0]`
- Each button sends a WhatsApp message specific to that row: `"Hi [FirstName], have you started editing [ClientName] - [EventName] ([EditType])?"`

**Result:**
```text
┌──────────────────────────────────────┐
│ Amreet Pandey              [Edit Lab]│
│ • Client · Event · FV   [Ask Amreet]│
│ • Client · Event · HL   [Ask Amreet]│
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Ramesh Chaudhary           [Edit Lab]│
│ • Client · Event · FV   [Ask Ramesh]│
└──────────────────────────────────────┘
```

### Files Changed
1. `src/components/video-edit/DesktopVideoEditTracker.tsx` — fetch `contact_no`, use as fallback phone, replace single WhatsApp icon with per-row "Ask [FirstName]" buttons

