
CREATE TABLE public.client_deliverables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registered_date_time_ad text NOT NULL,
  event_name text NOT NULL,
  section text NOT NULL,
  deliverable_type text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  quantity integer NOT NULL DEFAULT 1,
  item_names text NOT NULL DEFAULT '',
  album_name text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  synced_to_sheet boolean NOT NULL DEFAULT true,
  UNIQUE (registered_date_time_ad, event_name, section, deliverable_type)
);

ALTER TABLE public.client_deliverables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to client_deliverables"
  ON public.client_deliverables
  FOR ALL
  USING (true)
  WITH CHECK (true);
