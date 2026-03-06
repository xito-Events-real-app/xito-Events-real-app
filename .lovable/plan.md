

## Selected Photos: Inline Freelancer Layout + Per-Freelancer Notes

### Changes to `SelectedPhotosRow` in `DeliverablesSection.tsx`

**1. All photographers on one line, switch right next to name**

Current: Each photographer is a separate row with switch on the far right.
New: All photographers rendered inline (flex-wrap) as compact chips — badge + name + switch grouped tightly together.

```
Selected Photos                              [SWITCH]
  PB ARJUN [switch]  PG NIKIT [switch]  EP RAM [switch]
  
  [Notes for ARJUN...]     ← only if PB toggled ON
  [Notes for NIKIT...]     ← only if PG toggled ON
```

**2. Per-freelancer notes instead of single shared notes**

Change `notes` from `string` to `photographerNotes: Record<string, string>` in `ItemState`. Each toggled-ON photographer gets their own textarea labeled with their code+name.

### Specific code changes

**`ItemState` interface** (line 20-27): Replace `notes?: string` with `photographerNotes?: Record<string, string>`

**`buildDefaults`**: Update `selected_photos` default to include `photographerNotes: {}`

**`SelectedPhotosRow`** (lines 241-286): Rewrite the photographer rendering:
- Photographer list: single `div` with `flex flex-wrap gap-3 items-center` — each photographer is a compact inline group: `[badge][name][switch]` with `gap-1.5`
- Muted styling (`opacity-40`) stays for OFF photographers
- Below the photographer row: map over ON photographers only, render a labeled textarea for each: `"PB ARJUN notes..."` as placeholder
- Remove the old single `notes` textarea

**Files**: Only `src/components/client-detail/DeliverablesSection.tsx`

