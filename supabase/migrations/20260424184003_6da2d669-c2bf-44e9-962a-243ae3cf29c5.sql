CREATE TABLE public.photo_edit_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registered_date_time_ad text NOT NULL,
  registered_date_bs text DEFAULT ''::text,
  client_name text DEFAULT ''::text,
  event_name text DEFAULT ''::text,
  event_year text DEFAULT ''::text,
  event_month text DEFAULT ''::text,
  event_day text DEFAULT ''::text,
  event_date_ad text DEFAULT ''::text,
  photo_edit_status text DEFAULT 'QUEUE'::text,
  urgency text DEFAULT ''::text,
  edit_type text DEFAULT ''::text,
  editor text DEFAULT ''::text,
  stage_history text NOT NULL DEFAULT ''::text,
  deadline timestamp with time zone,
  edit_started_at timestamp with time zone,
  is_playing boolean NOT NULL DEFAULT false,
  playing_since timestamp with time zone,
  company_notes text DEFAULT ''::text,
  client_demand text DEFAULT ''::text,
  reference text DEFAULT ''::text,
  deleted boolean DEFAULT false,
  synced_to_sheet boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.photo_edit_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated access only for photo edit tracker"
ON public.photo_edit_tracker
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Public select for photo editor portal"
ON public.photo_edit_tracker
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Public update for photo editor portal"
ON public.photo_edit_tracker
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE INDEX idx_photo_edit_tracker_event_date
ON public.photo_edit_tracker (event_date_ad);

CREATE INDEX idx_photo_edit_tracker_editor_status
ON public.photo_edit_tracker (editor, photo_edit_status);

CREATE INDEX idx_photo_edit_tracker_active_rows
ON public.photo_edit_tracker (deleted, photo_edit_status);

CREATE TRIGGER update_photo_edit_tracker_updated_at
BEFORE UPDATE ON public.photo_edit_tracker
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();