-- New master venues table
CREATE TABLE public.xito_global_all_venues (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_type text NOT NULL DEFAULT '',
  venue_name text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  location_briefing text NOT NULL DEFAULT '',
  company_whatsapp text NOT NULL DEFAULT '',
  company_contact text NOT NULL DEFAULT '',
  gmail text NOT NULL DEFAULT '',
  owner1_name text NOT NULL DEFAULT '',
  owner1_contact text NOT NULL DEFAULT '',
  owner1_whatsapp text NOT NULL DEFAULT '',
  owner2_name text NOT NULL DEFAULT '',
  owner2_contact text NOT NULL DEFAULT '',
  owner2_whatsapp text NOT NULL DEFAULT '',
  google_map text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  instagram text NOT NULL DEFAULT '',
  facebook text NOT NULL DEFAULT '',
  tiktok text NOT NULL DEFAULT '',
  youtube text NOT NULL DEFAULT '',
  rating integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique index to prevent dupes by (name, city) case-insensitive
CREATE UNIQUE INDEX xito_global_all_venues_name_city_uniq
  ON public.xito_global_all_venues (lower(venue_name), lower(city));

-- Helpful filter indexes
CREATE INDEX xito_global_all_venues_type_idx ON public.xito_global_all_venues (venue_type);
CREATE INDEX xito_global_all_venues_city_idx ON public.xito_global_all_venues (city);

-- RLS
ALTER TABLE public.xito_global_all_venues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated access only"
  ON public.xito_global_all_venues
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- updated_at trigger
CREATE TRIGGER update_xito_global_all_venues_updated_at
  BEFORE UPDATE ON public.xito_global_all_venues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed from existing logistics_vendors_cache (venue category)
INSERT INTO public.xito_global_all_venues (
  venue_type, venue_name, city, area,
  company_whatsapp, company_contact, gmail,
  owner1_name, owner1_contact, owner1_whatsapp,
  owner2_name, owner2_contact, owner2_whatsapp,
  google_map, website, instagram, facebook, tiktok, youtube,
  rating, source
)
SELECT
  COALESCE(NULLIF(vendor_type, ''), 'Other'),
  COALESCE(name, ''),
  COALESCE(city, ''),
  COALESCE(area, ''),
  COALESCE(company_whatsapp, ''),
  COALESCE(company_contact, ''),
  COALESCE(gmail, ''),
  COALESCE(owner1, ''),
  COALESCE(owner1_contact, ''),
  COALESCE(owner1_whatsapp, ''),
  COALESCE(owner2, ''),
  COALESCE(owner2_contact, ''),
  COALESCE(owner2_whatsapp, ''),
  COALESCE(google_map, ''),
  COALESCE(website, ''),
  COALESCE(instagram, ''),
  COALESCE(facebook, ''),
  COALESCE(tiktok, ''),
  COALESCE(youtube, ''),
  COALESCE(NULLIF(regexp_replace(rating, '[^0-9]', '', 'g'), '')::int, 0),
  'event_details'
FROM public.logistics_vendors_cache
WHERE vendor_category = 'venue'
  AND COALESCE(name, '') <> ''
ON CONFLICT (lower(venue_name), lower(city)) DO NOTHING;