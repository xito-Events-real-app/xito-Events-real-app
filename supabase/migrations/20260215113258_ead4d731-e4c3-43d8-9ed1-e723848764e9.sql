
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
