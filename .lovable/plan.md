

# Fix "Legacy Types" Issue on All Venues Page

## What's happening
Your 71 seeded venues are stored as `BANQUET`, `HOTEL`, `HOME` (uppercase, from the old Sheets data). The official 12-type list I built was Title Case (`Banquet`, `Hotel`, `Home`). The sidebar compares them case-sensitively, so **every existing venue** got pushed into the "Legacy types" section at the bottom — even though they're all legitimate official types.

There's also one real legacy entry: **HILL** (1 venue) — this isn't in your official 12-type list.

## The fix

### 1. Normalize all existing data to Title Case
One-time migration: `UPDATE xito_global_all_venues SET venue_type = INITCAP(LOWER(venue_type))` — turns `BANQUET` → `Banquet`, `HOTEL` → `Hotel`, etc. for all 71 rows.

The `HILL` row becomes `Hill` and stays a legacy type (since it's not in the official 12).

### 2. Make all future writes case-consistent
- `mirrorVenueFromEventDetails()` in `src/lib/xito-global-venues-api.ts` — normalize incoming `venue_type` to Title Case before insert.
- `AddEditVenueDrawer.tsx` — the form already uses the official Title Case dropdown, so manual adds are fine. No change needed beyond the API normalizer for safety.

### 3. Sidebar comparison made case-insensitive (defense in depth)
`VenueTypeSidebar.tsx` — compare lowercased values when classifying official vs legacy, so any future case drift never breaks the grouping again.

## Result
- Sidebar will show: **Banquet 30, Hotel 12, Home 9, Resort 7, Restaurant 5, Park 2, Temple 2, Court 1, Gumba 1, Gurudwara 1, Church 1, Mosque 1** under official types.
- Under "Legacy types": just **Hill (1)** — which is genuinely not in your official list. You can either rename it via Edit Venue or add `Hill` to the official list.

## Files Changed
- 1 migration (UPPERCASE → Title Case normalizer for all rows)
- `src/lib/xito-global-venues-api.ts` (normalize on mirror insert)
- `src/components/xito-global/VenueTypeSidebar.tsx` (case-insensitive comparison)

