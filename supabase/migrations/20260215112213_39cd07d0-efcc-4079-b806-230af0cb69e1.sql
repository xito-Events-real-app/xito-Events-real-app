
-- Table 1: contact_details_cache (mirrors "BOOKED CLIENTS CONTACT DETAILS" sheet)
CREATE TABLE public.contact_details_cache (
  registered_date_time_ad text NOT NULL PRIMARY KEY,
  row_number integer DEFAULT 0,
  registered_date_bs text DEFAULT ''::text,
  client_name text DEFAULT ''::text,
  bride_full_name text DEFAULT ''::text,
  bride_contact_number text DEFAULT ''::text,
  bride_whatsapp_number text DEFAULT ''::text,
  bride_backup_number text DEFAULT ''::text,
  bride_backup_relation text DEFAULT ''::text,
  bride_backup_number2 text DEFAULT ''::text,
  bride_backup_relation2 text DEFAULT ''::text,
  bride_instagram text DEFAULT ''::text,
  bride_home_city text DEFAULT ''::text,
  bride_home_area text DEFAULT ''::text,
  bride_home_map text DEFAULT ''::text,
  bride_home_landmark text DEFAULT ''::text,
  groom_full_name text DEFAULT ''::text,
  groom_contact_number text DEFAULT ''::text,
  groom_whatsapp_number text DEFAULT ''::text,
  groom_backup_number text DEFAULT ''::text,
  groom_backup_relation text DEFAULT ''::text,
  groom_backup_number2 text DEFAULT ''::text,
  groom_backup_relation2 text DEFAULT ''::text,
  groom_instagram text DEFAULT ''::text,
  groom_home_city text DEFAULT ''::text,
  groom_home_area text DEFAULT ''::text,
  groom_home_map text DEFAULT ''::text,
  groom_home_landmark text DEFAULT ''::text,
  form_sent_date text DEFAULT ''::text,
  synced_to_sheet boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.contact_details_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to contact_details_cache"
  ON public.contact_details_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Table 2: event_details_cache (mirrors "BOOKED CLIENTS EVENT DETAILS" sheet)
CREATE TABLE public.event_details_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registered_date_time_ad text NOT NULL,
  event_index integer NOT NULL DEFAULT 0,
  event_name text DEFAULT ''::text,
  event_year text DEFAULT ''::text,
  event_month text DEFAULT ''::text,
  event_day text DEFAULT ''::text,
  event_date_ad text DEFAULT ''::text,
  venue_type text DEFAULT ''::text,
  venue_name text DEFAULT ''::text,
  venue_city text DEFAULT ''::text,
  venue_area text DEFAULT ''::text,
  venue_map text DEFAULT ''::text,
  event_start_time text DEFAULT ''::text,
  event_end_time text DEFAULT ''::text,
  parlour_type text DEFAULT ''::text,
  parlour_name text DEFAULT ''::text,
  parlour_city text DEFAULT ''::text,
  parlour_area text DEFAULT ''::text,
  parlour_map text DEFAULT ''::text,
  parlour_start_time text DEFAULT ''::text,
  parlour_end_time text DEFAULT ''::text,
  do_groom_come_in_mehndi text DEFAULT ''::text,
  guest_count text DEFAULT ''::text,
  event_demands text DEFAULT ''::text,
  event_references text DEFAULT ''::text,
  synced_to_sheet boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (registered_date_time_ad, event_index)
);

ALTER TABLE public.event_details_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to event_details_cache"
  ON public.event_details_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Performance indexes
CREATE INDEX idx_contact_details_registered ON public.contact_details_cache (registered_date_time_ad);
CREATE INDEX idx_event_details_registered ON public.event_details_cache (registered_date_time_ad);
CREATE INDEX idx_event_details_composite ON public.event_details_cache (registered_date_time_ad, event_index);
