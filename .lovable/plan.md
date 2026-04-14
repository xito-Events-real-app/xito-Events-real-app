
# Fix the wrong implementation and add real "Selected" folders where you meant

## What I found
You were right: the wrong thing was added.

Right now:
- `ClientLinkSection.tsx` has a **new top card called "Selected Photos"**. That is the mistake and should be removed.
- The **actual mobile screen inside Client Link** is the portal iframe, and its photo folders come from `PortalMyPhotos.tsx`.
- The **Album** page uses `AlbumSection.tsx`, where folder rows/counts are built from `tabs`.

Also important:
- The project already expects a real folder path called:
  - Xito: `[MONTH] EVENTS [YEAR] / [Client] / Photos / Selected`
  - pCloud: `WEDDING TALES NEPAL / [MONTH] EVENTS [YEAR] / [Client] / Photos / Selected`
- This is already reflected in `src/lib/xito-drive-utils.ts`, so the UI should match that structure.

## What I will change

### 1) Undo the wrong Client Link change
Remove the whole **Selected Photos** card from:
- `src/components/client-detail/ClientLinkSection.tsx`

That section should go back to only being:
- portal link actions
- WhatsApp send
- live portal preview

No top “Selected Photos” gallery there.

### 2) Add real "Selected" folder tabs inside the portal photo screen
Update:
- `src/components/client-portal/PortalMyPhotos.tsx`

Change the tab-building logic so it includes:
- existing event + freelancer tabs
- plus **Selected** folder tabs

How it will work:
- For each unique month/year used by the client’s photo assignments, create one extra tab for:
  - `.../Photos/Selected/`
- This Selected tab will behave exactly like the other tabs:
  - load Xito photos
  - show thumbnails
  - open image viewer
  - support pCloud fallback/open-in-pCloud behavior when needed

For single-month clients like your example, it will look like one natural extra folder.
For multi-month clients, it will create one Selected tab per month-year so the path stays correct.

### 3) Add "Selected" rows inside Album overview cards
Update:
- `src/components/client-detail/AlbumSection.tsx`

Its folder list currently only shows event/freelancer tabs.
I’ll extend the same `tabs` source so it also includes Selected entries.

That will make **both** of these cards include Selected:
- **Photos for Album** (Xito Drive)
- **Original Edited** (pCloud)

So Selected will appear there just like the other folder rows with counts.

### 4) Add Selected tab inside Album photo browser
Still in:
- `src/components/client-detail/AlbumSection.tsx`

The **View Photos** mode currently shows only the freelancer/event tabs from Xito.
I’ll add the same Selected tabs there too, so you can open the Selected folder in the album photo browser as part of the same tab list.

## Technical approach
I’ll keep this clean by fixing the folder source, not by adding another custom block.

### Shared idea
Where tabs are built, I’ll add synthetic folder entries like:

```text
Xito:
[MAGH EVENTS 2082]/Client Name/Photos/Selected/

pCloud:
WEDDING TALES NEPAL/[MAGH EVENTS 2082]/Client Name/Photos/Selected
```

### Labeling
To avoid confusion:
- normal tabs remain: `WEDDING (ARJUN)`
- selected tabs become something like:
  - `Selected`
  - or `Selected (MAGH)` when there are multiple month folders

### Result
After this fix:
- the wrong top “Selected Photos” section disappears
- the actual phone preview inside Client Link gets a real **Selected** folder tab
- the Album section shows Selected in both Xito and pCloud folder summaries
- the Album photo browser also gets the Selected folder tab

## Files to update
- `src/components/client-detail/ClientLinkSection.tsx`
- `src/components/client-portal/PortalMyPhotos.tsx`
- `src/components/client-detail/AlbumSection.tsx`

## Notes
- No database change is needed.
- No backend change is needed.
- This is a UI/data-path correction using the folder structure that already exists in the app.
- I will preserve the current freelancer/event tabs and only add Selected alongside them.
