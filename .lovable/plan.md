

# Logistics Cache Tables -- Safe Implementation Plan

## Core Principle: Google Sheets = Single Source of Truth

The two new cache tables (`logistics_vendors_cache` and `logistics_types_cache`) are **read-only mirrors** of Google Sheets data. They will never replace, overwrite, or delete anything in the original sheets.

## Data Flow (One-Way)

```text
Google Sheets (BANQUET, MAKEUP STUDIO, etc.)
        |
        |  PULL (read from Sheets, write to cache)
        v
Supabase Cache Tables (logistics_vendors_cache, logistics_types_cache)
        |
        |  READ (instant lookups)
        v
Frontend UI (auto-fill dropdowns, vendor lists)
```

**Write operations** (adding a new venue/parlour) will continue to go directly to Google Sheets first, then update the cache afterward. The cache never writes back to Sheets on its own.

## What Gets Created

### 1. Database Migration (already approved)
- `logistics_vendors_cache` -- stores all venue and parlour entries from type-specific sheets
- `logistics_types_cache` -- stores the list of available types from "EVENT DETAILS SETUP DATA"
- RLS enabled with open access (matching existing tables)
- Unique constraints prevent duplicates

### 2. No Existing Code Changes
- The existing `venue-api.ts` and `parlour-api.ts` files that write to Google Sheets will NOT be modified in this step
- Google Sheets remains the authority for all vendor data
- The cache is purely supplementary for faster reads

## Safety Guarantees

- Cache tables can be wiped and rebuilt at any time from Google Sheets without data loss
- No DELETE or UPDATE operations will ever be sent to Google Sheets from the cache layer
- If cache data is stale, a pull-refresh from Sheets corrects it instantly
- Existing add/edit vendor flows continue writing to Sheets directly

## Technical: SQL Migration

```text
CREATE TABLE public.logistics_vendors_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_category text NOT NULL DEFAULT '',
  vendor_type text NOT NULL DEFAULT '',
  row_number integer DEFAULT 0,
  name text DEFAULT '',
  company_whatsapp text DEFAULT '',
  company_contact text DEFAULT '',
  owner1 text DEFAULT '',
  owner1_contact text DEFAULT '',
  owner1_whatsapp text DEFAULT '',
  owner2 text DEFAULT '',
  owner2_contact text DEFAULT '',
  owner2_whatsapp text DEFAULT '',
  city text DEFAULT '',
  area text DEFAULT '',
  google_map text DEFAULT '',
  instagram text DEFAULT '',
  facebook text DEFAULT '',
  tiktok text DEFAULT '',
  youtube text DEFAULT '',
  website text DEFAULT '',
  gmail text DEFAULT '',
  rating text DEFAULT '',
  synced_to_sheet boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(vendor_category, vendor_type, name)
);

CREATE TABLE public.logistics_types_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT '',
  type_name text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(category, type_name)
);

-- RLS + Indexes
ALTER TABLE public.logistics_vendors_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logistics_types_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to logistics_vendors_cache"
  ON public.logistics_vendors_cache FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to logistics_types_cache"
  ON public.logistics_types_cache FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX idx_logistics_vendors_category_type
  ON public.logistics_vendors_cache (vendor_category, vendor_type);
CREATE INDEX idx_logistics_vendors_name
  ON public.logistics_vendors_cache (name);
CREATE INDEX idx_logistics_types_category
  ON public.logistics_types_cache (category);
```

## Next Steps (after this migration)

1. Create a pull-sync function to populate these tables from Google Sheets
2. Update frontend vendor lookups to read from cache first, with Sheets as fallback
3. Integrate into Master Sync as a new phase

