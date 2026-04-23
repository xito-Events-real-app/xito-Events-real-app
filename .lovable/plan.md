

# Add Favourites Folder Inside Photos Tab

A "Favourites" folder that lives **inside** the existing Photos tab (not a separate bottom-nav item). Tap a star on any photo to add it to Favourites. Helps clients shortlist photos quickly before doing the actual album selection.

## What the user will see

**Inside the Photos tab — new "★ Favourites" pill at the start of the tab strip**
- Sits before the event/photographer tabs (e.g. `★ Favourites · Wedding (Bride) · Wedding (Groom) · ...`).
- Shows a count badge: `★ Favourites (12)`.
- Empty by default. Only fills as the user stars photos.

**Small helper message under the tab strip (only on Favourites tab when empty)**
> Tip: Tap the ★ on any photo to save it here. This makes album selection faster — you can shortlist your favourites first, then pick the final ones for your album.

**Star icon on every photo (in both grid and full-screen viewer)**
- Grid tile: small star button top-right corner. Filled gold when favourited.
- Viewer top bar: prominent star button (next to Download). Press `F` to toggle.
- Tap to add/remove. Optimistic — instant feedback.

**Favourites view itself**
- Same 3-column grid layout as the regular Photos grid.
- Each tile has the star (filled, tap to remove) and a download button.
- Tap to open in `XitoImageViewer` — same viewer, with star + arrows working normally.
- Cleanly empty when nothing starred (shows the helper message above).

## What this is NOT
- Not a folder in pCloud or S3 — nothing is copied or duplicated.
- Not a replacement for the existing **My Album** selection — works alongside it. Stars are a personal shortlist; album selections still go through the existing flow.
- No bottom-nav changes.

## How it works

### Database (1 new table)
`client_favourite_photos`:
- `id` (uuid, PK)
- `registered_date_time_ad` (text)
- `photo_key` (text) — the S3 key
- `photo_url` (text, nullable) — cached for fast loading inside Favourites
- `created_at` (timestamp)
- Unique on `(registered_date_time_ad, photo_key)`
- RLS: `Public access for favourites` (anon ALL) — matches `client_album_selections`.

### New API helper — `src/lib/favourites-api.ts`
- `getFavourites(registeredDateTimeAD)` → list (with `photo_url`)
- `addFavourite(registeredDateTimeAD, photoKey, photoUrl?)` → upsert
- `removeFavourite(registeredDateTimeAD, photoKey)` → delete

### Photo viewer (`XitoImageViewer.tsx`)
- New optional props: `isFavourite?: boolean`, `onToggleFavourite?: (photoKey: string) => void`.
- Star button in top bar (gold when active).
- `F` keyboard shortcut.
- Existing call sites unaffected when props omitted.

### Photos tab (`PortalMyPhotos.tsx`)
- Load favourites on mount → keep in `Set<photoKey>` for O(1) lookup.
- Prepend `★ Favourites` pill (with count) to the existing tab strip.
- When `★ Favourites` tab is active:
  - If set is empty → show helper message centered.
  - Else → render grid using cached `photo_url`s; resolve any missing via `getE2FileUrls`.
- On every grid tile and inside `XitoImageViewer`: render star button wired to optimistic toggle (`addFavourite` / `removeFavourite`).
- Star also works inside the regular event tabs — toggling there updates the Favourites set immediately.

## Files Changed
1. **New migration** — `client_favourite_photos` table + public RLS policy
2. **New** `src/lib/favourites-api.ts`
3. `src/components/client-detail/XitoImageViewer.tsx` — star button + `F` shortcut
4. `src/components/client-portal/PortalMyPhotos.tsx` — Favourites pill at start of tab strip, helper message, star overlay on tiles, Favourites grid view

## Confirmations
- No folders created anywhere outside the database — purely DB-backed.
- No changes to bottom nav.
- Existing My Album system untouched and works in parallel.

