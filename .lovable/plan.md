

# XITO GLOBAL Module — All Venues Section

A new top-level module that becomes the single source of truth for venues, replacing the Sheets-based view with an in-app managed list. Existing event-detail venue logic is unchanged — it keeps writing to its current location, and we mirror every venue into a new `xito_global_all_venues` table.

## What the user will see

### New module: **XITO GLOBAL** (suite landing)
- New card on the suite landing page (purple/violet gradient, `Globe` icon).
- Path: `/xito-global`. Sub-routes:
  - `/xito-global/venues` — All Venues section (built now).
  - More sections can be added later (parlours, vendors etc.).

### All Venues page (`/xito-global/venues`)

**Header bar**
- Title "All Venues" with total count and "Add Venue" button (primary, top-right).
- Quick stats: total venues, total bookings tracked.

**Filter sidebar (left, desktop) / collapsible drawer (mobile)**
- Venue Type chips with counts (Banquet 30, Hotel 11, Home 9, Resort 7, etc. — all 12 official types from your list, plus any legacy ones already in DB).
- City filter (dropdown, populated from existing data).
- Rating filter (1–5 stars).
- Sort: Name A–Z · Most Booked · Recently Added · Highest Rated.

**Search bar** — fuzzy search across name, city, area, owner names, contact numbers.

**Main grid / table** (toggle desktop only — table default on desktop, card grid on mobile)
- Each row/card shows: Venue Name, Type badge, City · Area, Owner 1 name + tap-to-call, Rating stars, **"Booked X times" badge**, social-link icon row, edit pencil.
- Click row → opens full edit drawer.

**"Booked X times" logic**
- Computed from `event_details_cache.venue_name` (case-insensitive match) — shows how many client events have used this venue.
- Dropdown on the badge → expands a small list of matching client names + event dates so the user can see who booked it.

### Add / Edit Venue drawer (full structure from your message)
Sections, in order:
1. **Basics** — Venue Type (dropdown, 12 official types), Venue Name, City (combobox seeded from `nepal-cities`), Area, Location Briefing (textarea).
2. **Company Contact** — WhatsApp Number, Contact Number, Gmail.
3. **Owner 1** — Name, Contact Number, WhatsApp Number.
4. **Owner 2** — Name, Contact Number, WhatsApp Number.
5. **Online Presence** — Google Map, Website, Instagram, Facebook, TikTok, YouTube (uses existing `SocialLinkInput` component).
6. **Rating** — 1–5 star selector (`star-rating` UI component).

Save writes to `xito_global_all_venues`. Delete supported (with confirm dialog).

## What stays the same
- `EventDetailCard` / `FullScreenEventCard` venue add-flow inside Client Detail keeps writing to `logistics_vendors_cache` AND the Sheets backend exactly as today.
- Any new venue added through Event Details is **also mirrored** into `xito_global_all_venues` automatically (so the Global list stays complete going forward).
- All 71 existing venues from `logistics_vendors_cache` are seeded into the new table on migration so nothing is lost.

## How it works (technical)

### New table: `xito_global_all_venues`
Columns:
- `id` (uuid PK), `created_at`, `updated_at`
- `venue_type`, `venue_name`, `city`, `area`, `location_briefing`
- `company_whatsapp`, `company_contact`, `gmail`
- `owner1_name`, `owner1_contact`, `owner1_whatsapp`
- `owner2_name`, `owner2_contact`, `owner2_whatsapp`
- `google_map`, `website`, `instagram`, `facebook`, `tiktok`, `youtube`
- `rating` (int 0–5)
- `source` (text — `'manual'` | `'event_details'` for traceability)
- Unique index on `(lower(venue_name), lower(city))` to prevent dupes.
- RLS: `Authenticated access only` (matches `logistics_vendors_cache` pattern).
- Trigger: `update_updated_at_column` on UPDATE.

### Seed migration
- Insert all `logistics_vendors_cache` rows where `vendor_category = 'venue'` into the new table (ON CONFLICT DO NOTHING by name+city), tagged `source = 'event_details'`.

### Mirror on add (event details flow)
- Update `addVenueEntry()` in `src/lib/event-venue-api.ts` to additionally upsert into `xito_global_all_venues` after the existing Sheets + `logistics_vendors_cache` writes. Failure to mirror is logged but never blocks the existing flow.

### New files
1. `src/lib/xito-global-venues-api.ts` — `getAllVenues()`, `getVenueById()`, `addVenue()`, `updateVenue()`, `deleteVenue()`, `getVenueBookingCounts()` (single grouped query against `event_details_cache`).
2. `src/hooks/useXitoGlobalVenues.ts` — loads venues + booking counts, exposes filtered/sorted lists.
3. `src/pages/XitoGlobal.tsx` — landing page (currently shows just the All Venues entry tile).
4. `src/pages/XitoGlobalVenues.tsx` — main All Venues page (header, sidebar, search, table/grid).
5. `src/components/xito-global/VenueTypeSidebar.tsx` — left filter rail.
6. `src/components/xito-global/VenueTable.tsx` — desktop table with booking-count badges.
7. `src/components/xito-global/VenueCard.tsx` — mobile card view.
8. `src/components/xito-global/AddEditVenueDrawer.tsx` — full form (all 6 sections above).
9. `src/components/xito-global/VenueBookingsPopover.tsx` — small list of clients who booked a venue.

### Routing
- Add `/xito-global` and `/xito-global/venues` to `src/App.tsx`.
- Add new module entry in `src/lib/suite-modules.ts` (id `xito-global`, icon `Globe`, gradient violet).

## Files Changed
- 1 migration (new table + seed)
- 7 new files (page, hooks, components, API)
- `src/lib/event-venue-api.ts` (mirror write only — non-breaking)
- `src/lib/suite-modules.ts` (add module card)
- `src/App.tsx` (routes)

## Confirmations
- Old flow untouched. Sheets writes, `logistics_vendors_cache`, event-details forms — all keep working.
- Existing 71 venues seeded into the new table on first migration, so the new page is fully populated immediately.
- Booking counts come from live `event_details_cache.venue_name` matching — no extra writes needed.

