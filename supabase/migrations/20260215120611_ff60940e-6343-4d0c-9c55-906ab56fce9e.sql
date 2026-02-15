
-- =============================================
-- Phase 1: Create freelancers_cache, vendors_cache, dropdowns_cache
-- =============================================

-- 1. freelancers_cache — talent directory
CREATE TABLE public.freelancers_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  row_number integer DEFAULT 0,
  name text DEFAULT ''::text,
  contact_no text DEFAULT ''::text,
  whatsapp_no text DEFAULT ''::text,
  instagram text DEFAULT ''::text,
  facebook text DEFAULT ''::text,
  city text DEFAULT ''::text,
  area text DEFAULT ''::text,
  map_link text DEFAULT ''::text,
  pathao_landmark text DEFAULT ''::text,
  main_job text DEFAULT ''::text,
  photographer text DEFAULT ''::text,
  videographer text DEFAULT ''::text,
  photo_editor text DEFAULT ''::text,
  video_editor text DEFAULT ''::text,
  hybrid_shooter text DEFAULT ''::text,
  hybrid_editor text DEFAULT ''::text,
  drone_operator text DEFAULT ''::text,
  fpv_operator text DEFAULT ''::text,
  iphone_shooter text DEFAULT ''::text,
  synced_to_sheet boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT freelancers_cache_name_key UNIQUE (name)
);

ALTER TABLE public.freelancers_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to freelancers_cache"
  ON public.freelancers_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 2. vendors_cache — vendor directory
CREATE TABLE public.vendors_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  row_number integer DEFAULT 0,
  vendor_name text DEFAULT ''::text,
  vendor_type text DEFAULT ''::text,
  company_contact_no text DEFAULT ''::text,
  owner1_name text DEFAULT ''::text,
  owner1_contact_no text DEFAULT ''::text,
  owner1_whatsapp_no text DEFAULT ''::text,
  owner2_name text DEFAULT ''::text,
  owner2_contact_no text DEFAULT ''::text,
  owner2_whatsapp_no text DEFAULT ''::text,
  city text DEFAULT ''::text,
  area text DEFAULT ''::text,
  google_map_link text DEFAULT ''::text,
  instagram_link text DEFAULT ''::text,
  facebook_link text DEFAULT ''::text,
  tiktok_link text DEFAULT ''::text,
  youtube_link text DEFAULT ''::text,
  website_link text DEFAULT ''::text,
  email text DEFAULT ''::text,
  synced_to_sheet boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.vendors_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to vendors_cache"
  ON public.vendors_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. dropdowns_cache — form options as JSON
CREATE TABLE public.dropdowns_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  values_json text DEFAULT '[]'::text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dropdowns_cache_category_key UNIQUE (category)
);

ALTER TABLE public.dropdowns_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to dropdowns_cache"
  ON public.dropdowns_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);
