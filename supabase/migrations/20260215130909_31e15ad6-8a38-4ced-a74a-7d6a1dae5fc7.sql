
CREATE TABLE public.freelancer_event_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registered_date_time_ad text NOT NULL,
  event_name text NOT NULL,
  freelancer_name text NOT NULL,
  role_code text NOT NULL DEFAULT '',
  show_bride_details boolean NOT NULL DEFAULT true,
  show_groom_details boolean NOT NULL DEFAULT true,
  show_venue_details boolean NOT NULL DEFAULT true,
  show_parlour_details boolean NOT NULL DEFAULT true,
  personal_note text DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(registered_date_time_ad, event_name, freelancer_name)
);

ALTER TABLE public.freelancer_event_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to freelancer_event_settings"
  ON public.freelancer_event_settings FOR ALL
  USING (true) WITH CHECK (true);
