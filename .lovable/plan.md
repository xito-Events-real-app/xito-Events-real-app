

# XITO DRIVE Module

A new module that presents a Windows "This PC" style file explorer for booked clients, organized by Nepali month/year folders. Future-proofed for iDrive E2 (S3-compatible) storage integration.

## Folder Hierarchy

```text
XITO DRIVE (root)
├── MAGH EVENTS 2082/
│   ├── Ishan Shakya/
│   │   ├── Photos/
│   │   │   ├── Wedding/
│   │   │   │   ├── Nikit/
│   │   │   │   └── Arjun/
│   │   │   ├── Pre + Reception/
│   │   │   │   └── ...freelancers
│   │   │   └── Selected/
│   │   ├── Videos/
│   │   │   ├── Highlights/
│   │   │   ├── Reels/
│   │   │   └── Full Videos/
│   │   ├── Quotation/          (empty)
│   │   ├── Payments/           (empty)
│   │   ├── Project Managers/
│   │   │   ├── Wedding/
│   │   │   └── Pre + Reception/
│   │   └── Lightroom Catalog/
│   │       ├── Wedding/
│   │       │   ├── Nikit/
│   │       │   └── Arjun/
│   │       └── Pre + Reception/
│   │           └── ...freelancers
│   └── Another Client/
├── FALGUN EVENTS 2082/
└── ...
```

## Data Source

- Pull booked clients from `clients_cache` (where `sheet_source = 'booked'` and status is BOOKED)
- Parse `event_year`, `event_month` (Nepali) to group into month folders using `NEPALI_MONTHS` map
- Pull `freelancer_assignments` for photographer/videographer names per event
- Pull event names from multi-line `events` field on each client

## Files to Create/Edit

### 1. `src/pages/XitoDrive.tsx`
- Main page with year/month filter bar at top
- Root view: grid of month-year folder cards (e.g., "MAGH EVENTS 2082") styled like Windows folders with event count badges
- Breadcrumb navigation for drill-down
- "Create Folder" and "Upload Files" buttons (UI-only for now, will connect to iDrive E2 later)

### 2. `src/components/xito-drive/XitoDriveBrowser.tsx`
- Core browser component managing breadcrumb state and folder navigation
- Levels: root -> month-year -> client -> category (Photos/Videos/etc.) -> event -> freelancer
- Each level renders appropriate folder grid
- Virtual folder structure computed from cached data (no DB table needed yet)

### 3. `src/components/xito-drive/XitoDriveFolderCard.tsx`
- Windows-style folder card component with icon, name, item count
- Different color accents per category (Photos=amber, Videos=red, Quotation=blue, etc.)

### 4. `src/lib/xito-drive-utils.ts`
- `buildXitoDriveFolders(clients, assignments)` - computes the virtual folder tree from booked client data
- Grouping logic by Nepali month/year
- Helper to map freelancer assignment fields to photographer/videographer names per event

### 5. `src/lib/suite-modules.ts`
- Add XITO DRIVE module entry with path `/xito-drive`, HardDrive icon, gradient

### 6. `src/App.tsx`
- Add route `/xito-drive` pointing to `XitoDrive` page

## Key Design Decisions

- **Virtual folders only** - no new DB tables. The folder structure is computed from existing `clients_cache` and `freelancer_assignments` data. This keeps it lightweight and ready for iDrive E2 integration later, where real file storage will be added.
- **iDrive E2 ready** - all folder path building uses a consistent path schema (`/{year}-{month}/{clientName}/photos/{event}/{freelancer}/`) that maps directly to S3 bucket prefixes when iDrive E2 is connected.
- **Windows This PC aesthetic** - folder icons with colored accents, breadcrumb bar, grid layout, file count badges.

## Technical Details

- Uses `useBookedCachedData()` for booked clients
- Loads `freelancer_assignments` from Supabase for crew names
- Parses multi-line `events`, `event_year`, `event_month` fields via `parseEventDetails()`
- Year filter defaults to current BS year, month filter defaults to "All"
- No database migration needed

