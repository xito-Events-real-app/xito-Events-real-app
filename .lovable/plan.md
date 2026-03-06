

## Full Video: Smart Auto-Split Names

### What changes in `DeliverablesSection.tsx`

**1. Change Full Video from `SimpleRow` to `MultiItemRow`-style** — but with a twist on the +/- logic:

- Default: quantity=1, names=[eventName] (currently names is empty — fix this)
- When user clicks `+` (qty goes from 1→2): auto-split the event name if it contains `&`, `+`, or `and`
  - e.g. "WEDDING & RECEPTION" → names become ["WEDDING", "RECEPTION"]
  - e.g. "MEHENDI + SANGEET" → ["MEHENDI", "SANGEET"]
  - If no separator found, second name stays empty: ["EVENT NAME", ""]
- Further `+` clicks just append empty strings as usual
- `-` trims as usual

**2. Update `buildDefaults`** (line 42): Initialize full_video with `names: [ev.name]` instead of `names: []`

**3. Replace `SimpleRow` for Full Video** in the EventCard videos section with `MultiItemRow` — but we need a custom version or modify `MultiItemRow` to support the auto-split behavior on first expansion.

Best approach: Create a small `FullVideoRow` component that wraps the same +/- and naming UI but overrides `handleQty` to do the smart split when going from 1→2.

### Split logic
```typescript
function splitEventName(name: string): [string, string] {
  for (const sep of [' & ', ' + ', ' and ', ' AND ']) {
    const idx = name.indexOf(sep);
    if (idx !== -1) {
      return [name.slice(0, idx).trim(), name.slice(idx + sep.length).trim()];
    }
  }
  return [name, ''];
}
```

### Files changed
1. `src/components/client-detail/DeliverablesSection.tsx` — add `splitEventName` helper, new `FullVideoRow` component (or integrate into MultiItemRow with an `onExpand` callback), update `buildDefaults` for full_video names, swap SimpleRow→FullVideoRow in EventCard

