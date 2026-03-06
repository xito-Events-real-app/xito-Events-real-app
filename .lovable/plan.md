

## Database Persistence for Deliverables — Refined Plan

The previously approved plan is solid. Here's the refined version ready for implementation:

### 1. Database Migration

**Add columns to `client_deliverables`:**
- `photographer_toggles text DEFAULT ''` — JSON of `Record<string, boolean>`
- `photographer_notes text DEFAULT ''` — JSON of `Record<string, string>`

**Create `album_types` table:**
- `id uuid PK`, `type_name text NOT NULL UNIQUE`, `created_at timestamptz DEFAULT now()`
- Seed with: Magazine, Photobook, Canvas, Flush Mount, Coffee Table
- RLS: allow all access (matches existing pattern)

### 2. New File: `src/lib/deliverables-api.ts`
- `loadDeliverables(registeredDateTimeAD)` — fetch all rows from `client_deliverables`
- `saveDeliverable(data)` — upsert by composite key (`registered_date_time_ad`, `event_name`, `section`, `deliverable_type`)
- `loadAlbumTypes()` — fetch from `album_types`
- `saveAlbumType(name)` — insert if not exists

### 3. Update `DeliverablesSection.tsx`
- Accept `registeredDateTimeAD` prop
- On mount: load saved deliverables + album types from DB, merge with defaults
- On state change: debounce-save each deliverable row to DB (~1s debounce)
- On album type blur: insert new type to `album_types`

### 4. Update `ClientDetail.tsx`
- Pass `registeredDateTimeAD` to `DeliverablesSection`

### Files Changed
1. Migration SQL (2 column adds + 1 new table + seed data)
2. `src/lib/deliverables-api.ts` (new)
3. `src/components/client-detail/DeliverablesSection.tsx`
4. `src/pages/ClientDetail.tsx`

