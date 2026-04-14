

# Display Album Selection Photos in Client Link Section

## What went wrong
The previous change added folder path text to the Client Link section. The user actually wants to see the **actual selected photos** from the album selections (stored in `client_album_selections` table) displayed as a photo gallery within the Client Link section.

## What to build
- **Undo** the "Selection Folders" path display card from `ClientLinkSection.tsx`
- **Remove** the `eventMonth`/`eventYear` props and `NEPALI_MONTHS` map that were added
- **Add** a new "Selected Photos" section that loads photos from `client_album_selections` for this client
- Display the photos in a grid, grouped by album type, with thumbnails loaded from XITO Drive (E2) signed URLs
- Show album name headers with photo counts
- Clicking a photo opens the existing `XitoImageViewer`

## Technical approach
- Query `client_album_selections` by `registered_date_time_ad` to get all selected photos
- Use `getE2FileUrls()` to batch-fetch signed URLs for the photo keys
- Render a compact grid (3 or 4 columns) grouped by `album_type`
- Reuse `XitoImageViewer` for fullscreen viewing

## Files changed
1. **`src/components/client-detail/ClientLinkSection.tsx`** — Remove Selection Folders card, remove `eventMonth`/`eventYear` props and `NEPALI_MONTHS`. Add album selections photo gallery with E2 URL fetching and `XitoImageViewer`.
2. **`src/pages/ClientDetail.tsx`** — Remove `eventMonth`/`eventYear` props from `<ClientLinkSection>`.

