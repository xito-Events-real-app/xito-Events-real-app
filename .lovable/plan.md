

## Fix YouTube Link Sync — Two Bugs

### Bug 1: Merged rows only show one YT link
When Full Video + Highlights are merged into one display row, the code does `...pair.fv`, copying only the Full Video row's `youtubeLink`. The Highlights row's link is lost.

**Fix in `src/hooks/useVideoEditTracker.ts`** (merge logic, ~line 222):
- When building the merged display row, combine both youtube links: if FV has a link and HL has a link, join them with comma. This matches the existing comma-separated display format already used in `DesktopVideoEditTracker.tsx`.

### Bug 2: Title matching fails for bride-name-based titles
YouTube video titles use the bride/groom's actual name (e.g., "SIMRAN'S MEHNDI HIGHLIGHTS"), but the tracker row has event name "Brides Mehndi". The current code tries to match "BRIDES MEHNDI" against "SIMRANS MEHNDI HIGHLIGHTS" — which fails.

**Fix in `src/lib/youtube-link-sync.ts`** (matching logic, ~line 130):
- Add a fallback matching strategy: extract the core event keyword from the tracker event name (strip "Brides"/"Grooms"/"Bride's"/"Groom's" prefix to get just "MEHNDI", "RECEPTION", etc.)
- Match using: (bride name OR groom name in title) AND (event keyword in title) AND (edit type in title)
- Since we already know the playlist belongs to this client, the bride/groom name match is implicit — so really just need to match the **event keyword** + edit type
- Also ensure apostrophe normalization covers the straight apostrophe `'` (already done, but verify)

### Bug 3: Sync skips rows that already have a link on only one side
For merged FV+HL, if FV already got a link but HL didn't (or vice versa), the `!r.youtubeLink` filter skips the one that has a link. This is fine — each DB row is synced independently. The display fix (Bug 1) handles showing both.

### Files to modify
1. **`src/lib/youtube-link-sync.ts`** — Improve event name matching with keyword extraction fallback
2. **`src/hooks/useVideoEditTracker.ts`** — Combine FV + HL youtube links in merged display row

### Technical detail
```text
Event name normalization:
  "Brides Mehndi" → strip "BRIDES" prefix → "MEHNDI"
  "Grooms Reception" → strip "GROOMS" prefix → "RECEPTION"  
  "Engagement" → no prefix to strip → "ENGAGEMENT"

Match strategy (ordered):
  1. Try exact: title contains full event name + edit type (current logic)
  2. Try keyword: title contains event keyword + edit type (new fallback)
```

