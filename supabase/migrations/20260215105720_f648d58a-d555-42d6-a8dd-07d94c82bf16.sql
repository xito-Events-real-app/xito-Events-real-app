
-- Create clients_cache table for caching CLIENT TRACKER and BOOKED CLIENTS data
CREATE TABLE public.clients_cache (
  registered_date_time_ad text NOT NULL PRIMARY KEY,
  registered_date_bs text DEFAULT ''::text,
  client_name text DEFAULT ''::text,
  source text DEFAULT ''::text,
  client_location text DEFAULT ''::text,
  current_country text DEFAULT ''::text,
  contact_no text DEFAULT ''::text,
  whatsapp_no text DEFAULT ''::text,
  email text DEFAULT ''::text,
  event_location text DEFAULT ''::text,
  event_city text DEFAULT ''::text,
  events text DEFAULT ''::text,
  event_year text DEFAULT ''::text,
  event_month text DEFAULT ''::text,
  event_day text DEFAULT ''::text,
  event_date_ad text DEFAULT ''::text,
  who_added text DEFAULT ''::text,
  inquiry_date_ad text DEFAULT ''::text,
  inquiry_date_bs text DEFAULT ''::text,
  inquiry_time text DEFAULT ''::text,
  description text DEFAULT ''::text,
  quotation_data text DEFAULT ''::text,
  status_log text DEFAULT ''::text,
  client_handler text DEFAULT ''::text,
  call_log text DEFAULT ''::text,
  mindset text DEFAULT ''::text,
  our_bargained_rates text DEFAULT ''::text,
  client_bargained_rates text DEFAULT ''::text,
  comments text DEFAULT ''::text,
  final_quotation text DEFAULT ''::text,
  payments_made text DEFAULT ''::text,
  payment_dates_ad text DEFAULT ''::text,
  remaining_payment text DEFAULT ''::text,
  company_name text DEFAULT ''::text,
  service_types text DEFAULT ''::text,
  last_activity_log text DEFAULT ''::text,
  priority text DEFAULT ''::text,
  benzo_keep_notes text DEFAULT ''::text,
  sheet_source text NOT NULL DEFAULT 'tracker',
  row_number integer DEFAULT 0,
  synced_to_sheet boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clients_cache ENABLE ROW LEVEL SECURITY;

-- Open access policy (no auth in this app)
CREATE POLICY "Allow all access to clients_cache"
  ON public.clients_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Index for fast filtering by sheet source
CREATE INDEX idx_clients_cache_sheet_source ON public.clients_cache (sheet_source);

-- Index for finding unsynced rows
CREATE INDEX idx_clients_cache_unsynced ON public.clients_cache (synced_to_sheet) WHERE synced_to_sheet = false;
