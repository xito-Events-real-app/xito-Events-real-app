

# Fix Freelancer Assignment: Tooltips, Default OFF, Labels & Note Popup

## Changes

### 1. Tooltip on Every Switch Icon

Add `Tooltip` on hover for each toggle showing exactly what it controls with the event name:
- Bride Phone: "Bride (Wedding) Contacts" 
- Bride Location: "Bride (Wedding) Location"
- Groom Phone: "Groom (Wedding) Contacts"
- Groom Location: "Groom (Wedding) Location"
- Venue: "Venue (Wedding) Details"
- Parlour: "Parlour (Wedding) Details"

The event name is dynamically inserted from `assignment.event`.

### 2. Default All Switches OFF

Change the default values in `getSettingForFreelancer` from `true` to `false` for all 6 toggles:
- `show_bride_details: false`
- `show_bride_location: false`
- `show_groom_details: false`
- `show_groom_location: false`
- `show_venue_details: false`
- `show_parlour_details: false`

This means freelancers see NO details until the admin explicitly turns each switch ON.

### 3. Add Text Labels Next to Icons

Each toggle will show a short label + icon (not just icon):
- "BRIDE" + Phone icon
- "BRIDE" + MapPin icon
- "GROOM" + Phone icon
- "GROOM" + MapPin icon
- "VENUE" + Building icon
- "PARLOUR" + Scissors icon

Labels will be `text-[9px] font-bold uppercase` for compactness.

### 4. Compact Single-Row Layout

Rearrange the toggle area so all 6 toggles + note button fit in a single wrapping row instead of 3 stacked rows. Each freelancer takes one row:

```text
[PB] Barun   BRIDE📞[sw] BRIDE📍[sw] GROOM📞[sw] GROOM📍[sw] VENUE🏢[sw] PARLOUR✂[sw] [📝]
```

Switches will be slightly smaller (`h-5 w-9`) to fit inline.

### 5. Note Opens as Dialog Popup

Replace the inline expanding textarea with a `Dialog` component:
- Title: "Note for Barun"
- Subtitle (small text): Event name + Client name
- Textarea for the note
- Save / Cancel buttons

## File Modified

| File | Change |
|---|---|
| `src/components/client-detail/FreelancerAssignmentSection.tsx` | Tooltips on toggles, default OFF, text labels, single-row layout, Dialog note popup |

## Technical Details

### VisibilityToggle Updated Signature
```tsx
function VisibilityToggle({ label, icon, iconColor, checked, onChange, checkedColor, tooltip }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-0.5">
          <span className="text-[9px] font-bold uppercase">{label}</span>
          <Icon className="w-3 h-3" />
          <Switch className="h-5 w-9" checked={checked} onCheckedChange={onChange} />
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}
```

### Default Settings Change
```tsx
const getSettingForFreelancer = (freelancerName) => ({
  // All false by default - freelancer sees nothing until admin turns on
  show_bride_details: false,
  show_bride_location: false,
  show_groom_details: false,
  show_groom_location: false,
  show_venue_details: false,
  show_parlour_details: false,
  personal_note: '',
});
```

### Note Dialog
```tsx
<Dialog open={!!noteOpenFor} onOpenChange={(o) => !o && setNoteOpenFor(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Note for {noteOpenFor}</DialogTitle>
      <DialogDescription className="text-xs">
        {assignment.event} - {assignment.clientName}
      </DialogDescription>
    </DialogHeader>
    <Textarea value={noteText} onChange={...} />
    <DialogFooter>
      <Button variant="ghost" onClick={cancel}>Cancel</Button>
      <Button onClick={save}>Save Note</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

