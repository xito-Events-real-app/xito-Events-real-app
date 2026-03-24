

## Potential Delete — Netflix-Style Screenshot Manager

### Concept
A fully independent module for pasting Windows screenshots (Win+Shift+S), tagging them to storage devices with client name and responsible person, and managing them in a Netflix-style dark card grid. Completely isolated — no changes to existing features.

### Upload Flow
1. User presses Ctrl+V anywhere on the page
2. If clipboard has image → opens upload dialog with preview
3. If no image → toast: "Nothing has been copied"
4. Dialog fields:
   - **Device Type**: PC / Hard Drive / SSD (buttons)
   - **Device Name**: Dropdown populated from `storage_devices` table filtered by type
   - **Client Name**: Searchable input — searches `clients_cache` for suggestions, or type anything custom
   - **Responsibility**: Select from: Benzo / Nikit / Saugat / Barun / Arjun
   - **Notes**: Optional text
5. Save → uploads image to `potential-deletes` storage bucket, inserts row

### Dashboard (Netflix-style)
- Dark themed cards with red accent (Netflix vibe)
- **Stats bar**: Total | By Responsibility (Benzo: 12, Nikit: 8...) | Deleted count | Storage device breakdown
- **Filter by responsibility** — click a person's name to filter their screenshots
- **Filter by device** — click device name
- Cards show: thumbnail, client name, device badge, responsibility badge, timestamp
- Each card has a **Delete button** (moves to soft-deleted state, frees storage)
- Toggle to show/hide deleted items (with "Restore" option)

### Database

**New table: `potential_deletes`**
```sql
id uuid PK default gen_random_uuid()
image_url text NOT NULL
device_type text NOT NULL default ''
device_name text NOT NULL default ''
client_name text default ''
responsibility text default ''
notes text default ''
deleted boolean default false
created_at timestamptz default now()
```
RLS: Allow all (matches other tables).

**New storage bucket: `potential-deletes`** (public, for screenshot images)

### Files

1. **DB Migration** — Create `potential_deletes` table + `potential-deletes` storage bucket with public RLS
2. **New: `src/pages/PotentialDelete.tsx`**
   - Global paste listener (`useEffect` on `paste` event)
   - Upload dialog: image preview, device type buttons, device name dropdown (from `storage_devices`), client name searchable input (from `clients_cache`), responsibility selector (5 fixed names), notes
   - Netflix-style dashboard: dark cards, stats bar (total, per-responsibility, deleted count), filters by responsibility and device
   - Delete button on each card (soft delete: `deleted = true`), removes image from bucket
   - "Show Deleted" toggle with restore option
   - Responsive grid layout
3. **New: `src/hooks/usePotentialDeletes.ts`**
   - CRUD: load all records, upload image + insert, soft-delete (update `deleted=true` + remove from bucket), restore, hard-delete
   - Realtime subscription on `potential_deletes`
   - Uses `useStorageDevices()` for device list
4. **Edit: `src/lib/suite-modules.ts`** — Add module: `{ id: 'potential-delete', name: 'Potential Delete', icon: Trash2, path: '/potential-delete', status: 'active', gradient: 'from-red-500 to-orange-600' }`
5. **Edit: `src/App.tsx`** — Add route `/potential-delete` → `<PotentialDelete />`

### Card Design (Netflix-style)
```text
┌──────────────────────────┐
│ [Screenshot Thumbnail]   │
│                          │
│ PABINA ADHIKARI          │  ← client name, bold white
│ 🔴 WD 2TB  👤 Benzo     │  ← device + responsibility badges
│ 2 hours ago    [🗑 Del]  │
└──────────────────────────┘
```
Dark background (`bg-zinc-900`), red/orange accent badges, hover glow effect.

### Independence
- No changes to File Management, Video Edit, or any existing module
- Only touches: `suite-modules.ts` (add entry), `App.tsx` (add route), plus new files

