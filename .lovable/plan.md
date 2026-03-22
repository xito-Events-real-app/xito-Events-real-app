

## Revamped File Management Dashboard — Stock Market Style

### Overview
Replace the current basic dashboard section in the File Management page with a comprehensive, dark-themed, real-time monitoring dashboard. This builds on the existing `files_management` table, `useFilesManagement` hook, and `getFileManagementStats` API — no new database tables needed.

### Architecture
The dashboard replaces only the `activeSection === "dashboard"` content in `FileManagement.tsx`. All data comes from the existing `files_management` and `storage_devices` tables via new computed stats.

```text
┌──────────────────────────────────────────────────────────────┐
│ TOP BAR: Search | Today's Events | Last Updated             │
├──────────┬──────────┬──────────┬──────────┬─────────────────┤
│ Recently │ Files    │ Double   │ Storage  │                 │
│ Copied   │ Pending  │ Backup   │ Today    │  (clickable)    │
│ (green)  │ (red)    │ (yellow) │ (blue)   │                 │
├──────────┴──────────┴──────────┴──────────┴─────────────────┤
│ FILE TRACKING TABLE (filtered by clicked card)              │
│ Client | Event | Date | Copy Status | Backup | Size | Time │
├─────────────────────────────┬───────────────────────────────┤
│ RECENT ACTIVITY FEED        │ INSIGHTS / WARNINGS           │
│ (scrolling log)             │ (auto-generated stats)        │
└─────────────────────────────┴───────────────────────────────┘
```

### Files to Create/Modify

**1. New: `src/components/files/FilesDashboard.tsx`** (~500 lines)
Main dashboard component replacing the old dashboard cards. Contains:
- **Top bar**: Live search (queries `files_management` by `client_name`), "Today's Events" button (filters to today's event date), auto-refresh timestamp
- **4 status cards**: Computed from all files in DB:
  - Recently Copied (last 24h): files where `backup_1_recorded_at > now()-24h` → green
  - Files Pending: files where `final_generated_path` is empty → red
  - Double Backup Pending: files with backup 1 but no backup 2 → yellow
  - Storage Processed Today: sum of `size_gb` where copied today → blue
- **File tracking table**: Shows file rows with computed status columns, filterable by card click
- **Activity feed**: Recent `backup_1_recorded_at`/`backup_2_recorded_at` timestamps sorted descending
- **Insights panel**: Auto-computed warnings (clients without double backup, pending counts)
- All data fetched via single Supabase query on `files_management` + `storage_devices`

**2. New: `src/hooks/useFilesDashboardData.ts`** (~120 lines)
Hook that:
- Fetches ALL file records (no month filter) with realtime subscription
- Computes the 4 card stats, activity feed, and insights
- Auto-refreshes every 60 seconds
- Provides search/filter state

**3. New: `src/components/files/FileDashboardClientSheet.tsx`** (~200 lines)
Sheet/dialog that opens when clicking a client row in search results or table. Shows:
- Client name, event, date
- File size breakdown (photo vs video based on `freelancer_type`)
- Storage paths (backup 1, 2, 3)
- Status indicators
- Action buttons: Mark as Copied, Mark Double Backup

**4. New: `src/components/files/FileReminderPopup.tsx`** (~80 lines)
- Uses `setInterval` (3 hours) to show a dialog
- Fetches today's events from `files_management` where `event_date_ad` matches today
- Shows list with "View Client" and "Dismiss" buttons
- Stores last-shown timestamp in `localStorage` to avoid re-showing

**5. Modify: `src/pages/FileManagement.tsx`**
- Import and render `<FilesDashboard />` when `activeSection === "dashboard"` (replacing the current basic cards)
- Mount `<FileReminderPopup />` at page level
- Apply dark theme class to the dashboard section

**6. Modify: `src/index.css`**
- Add dark theme variables for the file dashboard (`.files-dashboard` scoped)
- Stock-market style animations: pulse on card value change, smooth number transitions

### Data Logic (no new tables needed)

All stats computed client-side from `files_management` rows:
```typescript
// Recently Copied (24h)
const recentlyCopied = files.filter(f => 
  f.backup_1_recorded_at && isWithin24Hours(f.backup_1_recorded_at)
).length;

// Pending
const pending = files.filter(f => !f.final_generated_path).length;

// Double Backup Pending  
const doubleBackupPending = files.filter(f => 
  f.final_generated_path && !f.backup_2_path
).length;

// Storage today
const storageToday = files
  .filter(f => f.backup_1_recorded_at && isToday(f.backup_1_recorded_at))
  .reduce((sum, f) => sum + (f.size_gb || 0), 0);
```

### Design Approach
- Dark theme using existing Tailwind dark classes (the sidebar already uses dark colors)
- Green/Red/Yellow/Blue color coding on cards with subtle glow effects
- Cards show animated count transitions
- Table uses existing `Table` components with status badges
- Activity feed is a scrollable `div` with relative timestamps
- Responsive: cards stack on mobile, table becomes card-based

### What This Does NOT Change
- Existing Files table (`FullScreenFilesTable`) — untouched
- Storage Devices section — untouched
- Sidebar — untouched
- All existing file CRUD operations — untouched
- Database schema — no changes

