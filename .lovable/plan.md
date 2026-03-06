

## Plan: Add Deliverables Section to Client Detail Page

### What It Does
A new "Deliverables" section in the Client Detail page (between Files and Freelancers in the sidebar) where you define what photo/video outputs are being provided to each client, per event, plus overall highlights/reels, albums, pendrives, and frames.

### Database

**New table: `client_deliverables`**

| Column | Type | Default |
|---|---|---|
| id | uuid | gen_random_uuid() |
| registered_date_time_ad | text | NOT NULL |
| event_name | text | NOT NULL (or 'OVERALL' / 'ALBUM' / 'PENDRIVE_FRAME') |
| section | text | NOT NULL ('photos' / 'videos' / 'overall' / 'album' / 'pendrive_frame') |
| deliverable_type | text | NOT NULL (e.g. 'all_photos', 'selected_photos', 'insta_post', 'full_video', 'highlights', 'reel', 'overall_highlights', 'overall_reel', 'bride_album', 'groom_album', 'other_album', 'pendrive', 'frame') |
| enabled | boolean | varies per type |
| quantity | integer | 1 |
| item_names | text | '' (comma-separated names, e.g. "Shwambar,Couple") |
| album_name | text | '' (for 'other_album' — the album name itself) |
| updated_at | timestamptz | now() |
| synced_to_sheet | boolean | true |

RLS: Allow all (matches existing pattern).

### New Files

**`src/components/client-detail/DeliverablesSection.tsx`**
- Props: `{ registeredDateTimeAD: string }`
- Loads events from `event_details_cache` (same pattern as FreelancerAssignmentSection)
- Loads/saves deliverables from `client_deliverables` table
- Auto-creates default rows on first load (all_photos ON, selected_photos OFF, insta_post OFF, full_video ON, highlights ON with default name "[EVENT] HIGHLIGHTS", reel OFF, insta_post OFF)

**UI structure per event:**

```text
┌─────────────────────────────────────────────────┐
│  MANGSIR 15 - ENGAGEMENT                        │
├────────────────────┬────────────────────────────┤
│  PHOTOS            │  VIDEOS                    │
│                    │                            │
│  ◉ All Photos      │  ◉ Full Video             │
│  ○ Selected Photos │  ◉ Highlights (1)  [+][-] │
│  ○ Insta Posts     │    → ENGAGEMENT HIGHLIGHTS │
│                    │  ○ Reel                    │
│                    │  ○ Insta Posts              │
└────────────────────┴────────────────────────────┘
```

When a multi-item type is enabled (insta posts, highlights, reel):
- Show +/- quantity controls
- For each item, show an editable name input
- Highlights default name: `[EVENT NAME] HIGHLIGHTS`

**After all events, three more sections:**

1. **OVERALL** — Overall Highlights (multi, nameable) + Overall Reel (multi, nameable)
2. **ALBUM** — Bride Side Album (multi, nameable type), Groom Side Album (multi, nameable type), Other Album (ask album name first, then nameable type)
3. **PENDRIVE & FRAME** — Just quantity inputs (number with +/-)

### Changes to Existing Files

**`src/components/client-detail/ClientDetailSidebar.tsx`**
- Add `'deliverables'` to `SectionType`
- Add sidebar item: `{ id: 'deliverables', label: 'Deliverables', icon: Package }` (after 'files')

**`src/components/client-detail/index.ts`**
- Export `DeliverablesSection`

**`src/pages/ClientDetail.tsx`**
- Import and render `DeliverablesSection` when `activeSection === 'deliverables'`

### UI Style
- Matches the existing dark theme (slate-900 background)
- Event headers styled like Files section (red-900/70 bg, centered, bold)
- Switch toggles reuse the same `Switch` component from freelancers
- Two-column Photos/Videos layout within each event card
- Expandable item names use `Input` components inline

### Data Flow
- On mount: load from `client_deliverables` where `registered_date_time_ad` matches
- If no rows exist for an event, auto-insert defaults
- Each toggle/quantity/name change → instant Supabase update (same pattern as freelancer settings)
- No Google Sheets sync needed (database-only feature)

