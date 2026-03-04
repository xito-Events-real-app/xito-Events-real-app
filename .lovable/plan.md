

## Redesign FilePathBuilderDialog: Wide Horizontal Layout with Colorful Sections

**Goal**: Make the dialog wide enough to fit everything without scrolling, with visually distinct colored sections.

### Layout Change

Change `max-w-lg` to `max-w-6xl` (or `max-w-[95vw]`) and reorganize content into a **3-column grid** layout:

**Column 1 (Storage & Path)** — Blue theme
- Storage Type, Device, Year Event Folder, Category
- Client Folder, Event Folder
- Side, Freelancer, Format
- Generated Path preview

**Column 2 (File Info & Cards)** — Green/Amber theme  
- Backup indicator + Header badge (top, full width above columns)
- Card selector + Add Card
- File Size, Number of Items
- File Format Type

**Column 3 (Meta & Actions)** — Purple/Rose theme
- Who Copied (dropdown + add new)
- Drive Upload checkbox + link
- Notes textarea

### Color Scheme per Section
- **Header/Backup**: Keep existing color-coded backup indicator
- **Storage & Path**: `bg-blue-50 border-blue-200` container
- **File Info**: `bg-emerald-50 border-emerald-200` container
- **Who Copied**: `bg-amber-50 border-amber-200` container
- **Drive Upload**: `bg-purple-50 border-purple-200` container
- **Notes**: `bg-rose-50 border-rose-200` container
- **Path Preview**: `bg-indigo-50 border-indigo-300` (standout)

### File Changes
Single file: `src/components/files/FilePathBuilderDialog.tsx` — lines 419-667 (the JSX return block)

- Line 421: `max-w-lg max-h-[90vh] overflow-y-auto` → `max-w-6xl w-full max-h-[90vh]`
- Restructure the form body into a 3-column grid with colored section cards
- Keep all existing logic/state unchanged, only reorganize the JSX layout

