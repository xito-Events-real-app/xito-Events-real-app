

# Supabase-First Mirror Architecture -- Safe Implementation Plan

## Risk Assessment: Will This Break Anything?

**Short answer: No, IF we follow one iron rule.**

**The Iron Rule**: Never remove a working Google Sheets API call. Only add a Supabase read BEFORE it. If Supabase returns empty, the original Sheets call runs exactly as it does today.

### What Could Go Wrong (and How We Prevent It)

| Risk | Impact | Prevention |
|------|--------|------------|
| Cache tables are empty on first open | Blank UI | Every read function falls back to Google Sheets if cache returns 0 rows |
| sync-all-data edge function fails | Cache never populates | Original Sheets API calls still work as fallback -- user sees data, just slower |
| Data goes stale in Supabase | Outdated info shown | Master Sync repopulates everything; manual refresh buttons still call Sheets directly |
| Someone edits Google Sheets directly | Supabase cache is outdated | Next Master Sync fixes it; individual client refresh also works |
| New table migration fails | App crashes on query | We wrap all Supabase queries in try/catch with Sheets fallback |

### What We Are NOT Changing

- All WRITE operations still go to Google Sheets first (source of truth preserved)
- Master Sync still works
- Individual client refresh buttons still work
- The google-sheets edge function is untouched
- No existing data is deleted or modified

---

## Implementation: 3 Phases

### Phase 1: Create Missing Database Tables

Create 3 new tables via SQL migration:

**`freelancers_cache`** -- talent directory used in assignment dropdowns

- id (uuid, PK)
- row_number (integer)
- name (text, unique)
- contact_no, whatsapp_no, instagram, facebook (text)
- city, area, map_link, pathao_landmark (text)
- main_job (text)
- photographer, videographer, photo_editor, video_editor (text, YES/NO flags)
- hybrid_shooter, hybrid_editor (text)
- drone_operator, fpv_operator, iphone_shooter (text)
- synced_to_sheet (boolean, default true)
- updated_at (timestamptz)

**`vendors_cache`** -- vendor directory

- id (uuid, PK)
- row_number (integer)
- vendor_name (text)
- vendor_type (text)
- company_contact_no (text)
- owner1_name, owner1_contact_no, owner1_whatsapp_no (text)
- owner2_name, owner2_contact_no, owner2_whatsapp_no (text)
- city, area, google_map_link (text)
- instagram_link, facebook_link, tiktok_link, youtube_link, website_link (text)
- email (text)
- synced_to_sheet (boolean, default true)
- updated_at (timestamptz)

**`dropdowns_cache`** -- form options stored as JSON key-value pairs

- id (uuid, PK)
- category (text, unique) -- e.g. 'sources', 'clientLocations', 'allEvents'
- values_json (text) -- JSON string of the options array
- updated_at (timestamptz)

All tables get permissive RLS policies matching the existing cache tables.

### Phase 2: Create `sync-all-data` Edge Function

A single backend function that pulls data from Google Sheets into Supabase cache tables. This replaces the need for the frontend to make dozens of individual Sheets API calls.

**Supported actions:**
- `pull-freelancers` -- reads WTN FREELANCERS sheet, upserts into `freelancers_cache`
- `pull-vendors` -- reads WTN VENDORS sheet, upserts into `vendors_cache`
- `pull-logistics` -- reads EVENT DETAILS SETUP DATA + type-specific sheets, upserts into `logistics_types_cache` + `logistics_vendors_cache`
- `pull-dropdowns` -- reads CLIENT TRACKER SETUP + EVENT SETUP DATA, upserts into `dropdowns_cache`
- `pull-event-details` -- reads EVENT DETAILS sheet, upserts into `event_details_cache`
- `pull-contact-details` -- reads CONTACT DETAILS sheet, upserts into `contact_details_cache`
- `pull-all` -- runs all of the above sequentially (for first-time setup and Master Sync)

This function uses the same Google Service Account credentials already configured.

### Phase 3: Switch Frontend to Cache-First Reads

Every API module gets the same pattern:

```text
try {
  data = query Supabase cache table
  if (data has rows) -> return data (instant, done)
} catch { }

// Fallback: original Google Sheets call (unchanged)
data = call google-sheets edge function
return data
```

**Files to update:**

| File | What Changes |
|------|-------------|
| `src/lib/freelancer-api.ts` | `getFreelancers()` reads from `freelancers_cache` first, falls back to Sheets. Write functions (add/update/delete) still go to Sheets first, then upsert/delete cache. |
| `src/lib/freelancer-assignment-api.ts` | `getClientFreelancerAssignments()`, `getAllFreelancerAssignments()`, `getFreelancerBookings()`, `checkFreelancerAvailability()` query `freelancer_assignments` table directly. If empty, fall back to Sheets. |
| `src/lib/vendor-api.ts` | `getVendors()` reads from `vendors_cache` first. `getVendorTypes()` reads distinct types from cache. Writes go to Sheets then upsert cache. |
| `src/lib/event-venue-api.ts` | `getVenueTypes()` queries `logistics_types_cache` where category='venue'. `getVenuesByType()` queries `logistics_vendors_cache`. Falls back to Sheets if empty. |
| `src/lib/parlour-api.ts` | Same pattern as event-venue-api but with category='parlour'. |
| `src/hooks/useClientContactDetails.ts` | `fetchContactDetails()` queries `contact_details_cache` first. Falls back to Sheets if not found. |
| `src/hooks/useDropdownData.ts` | Reads from `dropdowns_cache` first. Falls back to Sheets and saves to cache. |
| `src/components/suite/TodayEventsHero.tsx` | Uses `loadAssignmentsFromCache()` instead of calling Sheets. |
| `src/components/suite/MasterSyncButton.tsx` | Calls `sync-all-data` with `pull-all` to populate ALL cache tables during Master Sync, replacing the per-client vendor refresh loop that causes 429 errors. |

### First-Time Open Flow

```text
App opens -> memory cache empty -> Supabase clients_cache has data -> instant render
                                -> freelancers_cache empty -> falls back to Sheets -> saves to cache
                                -> dropdowns_cache empty -> falls back to Sheets -> saves to cache

After first Master Sync: ALL tables populated
All subsequent opens: Everything from Supabase (instant)
```

### Auto-Population Trigger

On first app open, after the main client data loads, a background check runs:
1. Query `freelancers_cache` count
2. If 0, call `sync-all-data` with `pull-all` in the background
3. This silently populates all empty caches without blocking the UI
4. Meanwhile, any module that needs data uses the Sheets fallback

This means:
- First open: slightly slower (same as today, uses Sheets fallback)
- After background sync completes: everything is in Supabase
- Second open onward: instant from Supabase

---

## Safety Guarantees

1. **No existing code is deleted** -- every Sheets API call becomes a fallback, not removed
2. **No data is modified** -- we only ADD reads from Supabase before existing Sheets reads
3. **Google Sheets stays the source of truth** -- all writes still go to Sheets first
4. **Master Sync rebuilds everything** -- if any cache gets corrupted, one sync fixes it
5. **Rollback is trivial** -- if anything breaks, removing the cache-first checks restores original behavior

## Implementation Order

1. SQL migration: create `freelancers_cache`, `vendors_cache`, `dropdowns_cache`
2. Create and deploy `sync-all-data` edge function
3. Update `freelancer-api.ts` (highest impact -- used in every assignment dropdown)
4. Update `freelancer-assignment-api.ts` (direct Supabase queries)
5. Update `vendor-api.ts` (cache-first reads)
6. Update `event-venue-api.ts` and `parlour-api.ts` (logistics cache)
7. Update `useClientContactDetails.ts` (contact cache)
8. Update `useDropdownData.ts` (dropdowns cache)
9. Update `TodayEventsHero.tsx` (use loadAssignmentsFromCache)
10. Update `MasterSyncButton.tsx` (call sync-all-data instead of per-client loops)
11. Add background auto-population trigger on first open

