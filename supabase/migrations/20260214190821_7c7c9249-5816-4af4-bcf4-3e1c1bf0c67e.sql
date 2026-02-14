CREATE TABLE public.freelancer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registered_date_time_ad text NOT NULL,
  registered_date_bs text DEFAULT '',
  client_name text DEFAULT '',
  event text NOT NULL,
  event_year text DEFAULT '',
  event_month text DEFAULT '',
  event_day text DEFAULT '',
  event_date_ad text DEFAULT '',
  photographer_bride text DEFAULT '',
  photographer_groom text DEFAULT '',
  videographer_bride text DEFAULT '',
  videographer_groom text DEFAULT '',
  extra_photographer text DEFAULT '',
  extra_videographer text DEFAULT '',
  assistant text DEFAULT '',
  iphone_shooter text DEFAULT '',
  drone_operator text DEFAULT '',
  fpv_operator text DEFAULT '',
  required_categories text DEFAULT '',
  synced_to_sheet boolean DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(registered_date_time_ad, event)
);

ALTER TABLE public.freelancer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to freelancer_assignments"
  ON public.freelancer_assignments FOR ALL
  USING (true) WITH CHECK (true);