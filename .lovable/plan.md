

# Event Info Card — Between Player and Playlist Sidebar

## Layout Change

The current layout is:
- Left column: `flex-1` with `max-w-[900px]` player inside
- Right column: `w-[480px]` sidebar

The player and sidebar sizes stay exactly the same. The only change is wrapping the player row in a `flex` container so the Event Info Card sits in the gap to the right of the player, matching its height.

```text
┌─────────────────────────────────────────────────────────────────────┐
│ HEADER                                                              │
├────────────────────────────────────────────────────┬────────────────┤
│  ┌─ PLAYER (900px max) ─┬── EVENT INFO CARD ─────┐│ PLAYLIST (480) │
│  │                      │ EVENT: BRIDE RECEPTION  ││                │
│  │  YouTube Player      │ 👰 Madhav Wagle         ││ [Recent tab]   │
│  │  (aspect-video)      │ 🤵 Urmila Bashyal       ││ [Playlist tab] │
│  │  UNCHANGED           │ 📅 Falgun 12 / Mar 23   ││                │
│  │                      │ 🎥 Barun, Jeewan        ││                │
│  │                      │ 📷 Ram                   ││                │
│  │                      │ 💾 300GB · MG LION       ││                │
│  └──────────────────────┴─────────────────────────┘│                │
│  Title + Timing grid + Send to Client               │                │
│  Comments Section                                    │                │
├──────────────────────────────────────────────────────┴────────────────┤
│ UPLOAD BAR                                                            │
└───────────────────────────────────────────────────────────────────────┘
```

## File: `src/components/suite/YouTubeDashboard.tsx`

### Change 1: Add state + useEffect for event card data

New state:
```ts
const [eventCardData, setEventCardData] = useState<{
  bride: string; groom: string;
  eventName: string; eventDateBS: string; eventDateAD: string;
  videographers: string[]; photographers: string[];
  totalSizeGB: number; devices: { name: string; paths: string[] }[];
} | null>(null);
```

New `useEffect` triggers when `trackerInfo?.registered_date_time_ad` changes. Runs 3 parallel queries:
- `contact_details_cache` → bride/groom names
- `freelancer_assignments` → filter by `registered_date_time_ad` + `event` = `trackerInfo.event_name` → extract videographer/photographer names
- `files_management` → filter by `registered_date_time_ad` + `event_name` + `deleted_or_not=false` → SUM `size_gb`, collect device names + `final_generated_path` grouped by device

Convert `trackerInfo.event_date_ad` to BS using `adToBS()`.

### Change 2: Wrap player in a flex row

Change the player area (line ~1097) from:
```html
<div className="w-full max-w-[900px] aspect-video bg-black ...">
```
to:
```html
<div className="flex gap-3 mb-3">
  <div className="w-full max-w-[900px] aspect-video bg-black ...">
    {/* player unchanged */}
  </div>
  {/* Event Info Card - fills remaining width, matches player height */}
  {eventCardData && (
    <div className="flex-1 min-w-[200px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 ...">
      {/* card content */}
    </div>
  )}
</div>
```

Player size and sidebar size are completely untouched.

### Change 3: Event Info Card content

A dark gradient card with rows:
- **Event Name**: Bold uppercase text (e.g., "BRIDE RECEPTION")
- **Bride/Groom**: Names as clickable cyan/pink pills → sets `searchQuery` to filter sidebar
- **Date**: Formatted as "Falgun 12 / March 23, 2082" using `adToBS()`
- **Videographers/Photographers**: Names as clickable blue pills → sets `searchQuery`
- **RAW Files**: Total GB + device name badges. Hover shows `HoverCard` with full `final_generated_path` entries for that device

### Change 4: Clickable name filtering

Clicking any name pill calls `setSearchQuery(name)`. The sidebar already filters by `searchQuery`. No other changes needed — the existing search infrastructure handles it.

### Imports to add
- `HardDrive, Camera, Video, X` from `lucide-react`
- `adToBS, nepaliMonthsEnglish` from `@/lib/nepali-date`
- `HoverCard, HoverCardTrigger, HoverCardContent` from `@/components/ui/hover-card`

