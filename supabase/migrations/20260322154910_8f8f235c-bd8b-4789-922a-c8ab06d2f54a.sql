
CREATE TABLE public.video_edit_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registered_date_time_ad text NOT NULL,
  registered_date_bs text DEFAULT '',
  client_name text DEFAULT '',
  event_name text DEFAULT '',
  event_year text DEFAULT '',
  event_month text DEFAULT '',
  event_day text DEFAULT '',
  event_date_ad text DEFAULT '',
  video_edit_status text DEFAULT 'QUEUE',
  urgency text DEFAULT '',
  sub_event_name text DEFAULT '',
  edit_type text DEFAULT '',
  editor text DEFAULT '',
  company_notes text DEFAULT '',
  client_demand text DEFAULT '',
  reference text DEFAULT '',
  songs text DEFAULT '',
  synced_to_sheet boolean DEFAULT false,
  deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.video_edit_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to video_edit_tracker"
  ON public.video_edit_tracker FOR ALL TO public
  USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.video_edit_tracker;
