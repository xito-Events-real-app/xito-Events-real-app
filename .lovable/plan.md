
# Mobile-Friendly File Management Module

## Problem
The File Management page (`/files`) currently renders a fixed 256px sidebar with `ml-64` on the main content area. On mobile, this makes the content invisible or severely clipped -- there's no responsive handling at all.

## Solution
Create a mobile layout that replaces the sidebar with a top tab bar and renders content full-width, similar to how other modules (Booked Clients, Finance, Vendors) handle mobile vs desktop.

## Changes

### 1. Update `FileManagement.tsx` (page)
- Import and use `useIsMobile()` hook
- Conditionally render:
  - **Mobile**: A full-width layout with a sticky header (back button + title), horizontal tab pills (Dashboard / Storage / Files), and device type filter chips when on Storage tab. No sidebar.
  - **Desktop**: Keep the existing sidebar layout as-is (no changes)

### 2. Mobile Layout Structure
```text
+----------------------------------+
| <- Back    File Management       |
+----------------------------------+
| [Dashboard] [Storage] [Files]    |  <- tab pills
+----------------------------------+
| [All] [HDD] [SSD] [PC]          |  <- only on Storage tab
+----------------------------------+
|                                  |
|   (section content)              |
|   Dashboard cards / Device       |
|   cards / Files table            |
|                                  |
+----------------------------------+
| [+ Add Device] FAB               |  <- floating action button
+----------------------------------+
```

- **Header**: Back arrow navigating to `/`, module name, gradient icon
- **Tab bar**: Horizontal scroll of pill buttons for Dashboard, Storage, Files
- **Device filter chips**: Shown only when Storage tab is active (All / Hard Drive / SSD / PC)
- **Content**: Full-width rendering of the same dashboard stats, StorageDevicesSection, and FilesManagementTable
- **FAB**: Floating "Add Device" button at bottom-right

### 3. No changes needed to:
- `FileManagementSidebar.tsx` (desktop only, untouched)
- `StorageDevicesSection.tsx` (already has responsive grid `grid-cols-1 md:grid-cols-2`)
- `FilesManagementTable.tsx` (already works full-width)

### Technical Details

**File modified**: `src/pages/FileManagement.tsx`

The page will use `useIsMobile()` to branch:
- Mobile path: renders inline header, tabs, filters, content, and FAB -- no sidebar
- Desktop path: renders existing sidebar + `ml-64` content layout unchanged

The mobile dashboard stats grid will use `grid-cols-2` for the 4 stat cards, and the quick-link cards will stack vertically. The storage device cards already handle `grid-cols-1` on small screens.
