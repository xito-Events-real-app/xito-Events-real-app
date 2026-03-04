

## Increase Text Size + Hover Popup on Backup Pills

### 1. Increase Text Sizes (FullScreenFilesTable.tsx)

Bump all tiny text throughout:
- Table headers: `text-[10px]` → `text-xs` (12px)
- Table body cells: `text-[11px]`/`text-[10px]` → `text-xs`/`text-sm`
- Badge text: `text-[9px]`/`text-[10px]` → `text-[11px]`/`text-xs`
- Section headers: `text-xs` → `text-sm`
- BackupPill badge: `text-[9px]` → `text-[11px]`
- Mobile card text similarly bumped

### 2. Hover Popup on Backup Pills

Replace the simple `BackupPill` badge with a `HoverCard` that shows on hover:

**Data shown in popup:**
- **Device name + event date/time**: e.g. `W-T-N-19 (20 FALGUN 9:15 PM)`
  - Day from `file.event_day`, month from `file.event_month` (mapped to Nepali name)
  - Time from `file.updated_at` or `file.created_at`
- **Full path**: the complete `final_generated_path` / `backup_2_path` / `backup_3_path`
- **Time ago**: computed from `file.updated_at` using `date-fns` `formatDistanceToNow` or manual calculation showing `X days Y hrs Z mins ago`

**Implementation:**
- Import `HoverCard, HoverCardTrigger, HoverCardContent` from ui
- Modify `BackupPill` to accept additional props: `path`, `deviceName`, `eventDay`, `eventMonth`, `updatedAt`
- Wrap the badge in `HoverCard` with a styled popup showing the 3 lines
- Helper function `getTimeAgo(dateStr)` to compute days/hrs/mins format

### Files Changed
Single file: `src/components/files/FullScreenFilesTable.tsx`

