
# Fix: Crew Card Notes — Compact Height, Hover Popover with Edit

## The Problem

Lines 1143–1145 in `AllClientsCrewTable.tsx`:
```tsx
{note && (
  <p className="text-[10px] text-amber-700 bg-yellow-50 rounded px-1.5 py-0.5 mt-1 leading-relaxed whitespace-pre-line border border-yellow-100">{note}</p>
)}
```
`whitespace-pre-line` + multi-line notes = card grows tall → entire flex row wraps to 2 lines.

## The Fix — Single File, 3 Changes

### Change 1: Replace the note `<p>` with a compact hover popover trigger

The note block (lines 1143–1145) becomes a single compact button — same height as one text line — that opens a Popover on click. The button is `overflow-hidden` + `truncate` so it never grows the card taller:

```tsx
{note && (
  <Popover>
    <PopoverTrigger asChild>
      <button className="flex items-center gap-1 mt-1 text-[9px] text-amber-600 bg-yellow-50 border border-yellow-100 rounded px-1.5 py-0.5 w-full text-left hover:bg-yellow-100 transition-colors overflow-hidden">
        <StickyNote className="w-2.5 h-2.5 shrink-0" />
        <span className="truncate block">{note}</span>
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-72 p-3 z-[300]" align="start" side="bottom">
      <NoteEditPopover
        name={name}
        registeredDateTimeAD={row.registeredDateTimeAD}
        eventName={row.event}
        initialNote={note}
        onSave={(newNote) => handleNoteSaved(name, newNote)}
      />
    </PopoverContent>
  </Popover>
)}
```

Key: the trigger button has `overflow-hidden` + `truncate` on the span — it occupies exactly one line height, regardless of how long the note is. The card height is now always equal to: role badge line + name line + (optional) note indicator line — same as Bride/Groom cards.

### Change 2: Add `NoteEditPopover` sub-component (new function, ~25 lines)

Defined just before `EventLogisticsPanel` (~line 970). Handles view/edit states + Supabase save:

```tsx
function NoteEditPopover({ name, registeredDateTimeAD, eventName, initialNote, onSave }: {
  name: string;
  registeredDateTimeAD: string;
  eventName: string;
  initialNote: string;
  onSave: (note: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialNote);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await supabase
      .from('freelancer_event_settings')
      .update({ personal_note: value })
      .eq('registered_date_time_ad', registeredDateTimeAD)
      .eq('event_name', eventName)
      .eq('freelancer_name', name);
    setSaving(false);
    setEditing(false);
    onSave(value);
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
        📝 {name}
      </p>
      {editing ? (
        <>
          <Textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            className="text-xs min-h-[80px] resize-none"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setEditing(false); setValue(initialNote); }}
              className="text-[10px] text-gray-500 hover:text-gray-700 px-2 py-1 rounded">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="text-[10px] bg-amber-500 text-white px-2 py-1 rounded hover:bg-amber-600 flex items-center gap-1">
              {saving && <Loader2 className="w-2.5 h-2.5 animate-spin" />} Save
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{value}</p>
          <button onClick={() => setEditing(true)}
            className="text-[10px] text-amber-600 hover:underline flex items-center gap-1 mt-1">
            <Pencil className="w-2.5 h-2.5" /> Edit Note
          </button>
        </>
      )}
    </div>
  );
}
```

### Change 3: Local settings state + `handleNoteSaved` in `EventLogisticsPanel`

So saved edits are reflected immediately (no re-fetch), convert `EventLogisticsPanel` to keep a local copy of `settings`:

```tsx
function EventLogisticsPanel({ ..., settings: settingsProp, ... }) {
  const [calendarFor, setCalendarFor] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState(settingsProp);
  useEffect(() => { setLocalSettings(settingsProp); }, [settingsProp]);

  const handleNoteSaved = (freelancerName: string, newNote: string) => {
    setLocalSettings(prev => prev.map(s =>
      s.freelancer_name?.toLowerCase() === freelancerName.toLowerCase()
        ? { ...s, personal_note: newNote }
        : s
    ));
  };
  // ...use localSettings instead of settings everywhere below
}
```

The crew card loop on line 1126 changes `settings.find(...)` → `localSettings.find(...)`.

## New Imports Needed

Add to the lucide-react import line:
- `StickyNote` 
- `Pencil`

Add to UI imports:
- `Textarea` from `@/components/ui/textarea`

`useEffect` — already imported (React is already used with hooks).

`Popover`, `PopoverTrigger`, `PopoverContent` — already imported and used in this file (for the crew cell assignment popover). No new import needed.

## Files Changed

Only **`src/components/suite/AllClientsCrewTable.tsx`**:

1. Lucide import line — add `StickyNote`, `Pencil`
2. Add `import { Textarea } from "@/components/ui/textarea";`
3. Add `NoteEditPopover` function (~line 970, before `EventLogisticsPanel`)
4. `EventLogisticsPanel` — add `localSettings` state + `useEffect` sync + `handleNoteSaved`; change `settings.find` → `localSettings.find`; replace the note `<p>` block (lines 1143–1145) with the compact Popover trigger

No schema changes. No other files. No new routes.

## Result

Every crew card is now the same max-height as the Bride/Groom/Venue cards. Notes show as a single amber truncated line. Clicking it opens a popover showing the full note with an Edit button. Saving updates Supabase and immediately reflects in the card without re-fetching.
