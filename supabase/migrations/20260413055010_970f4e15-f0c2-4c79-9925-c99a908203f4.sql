
CREATE TABLE public.album_selection_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registered_date_time_ad text NOT NULL,
  client_name text NOT NULL DEFAULT '',
  bride_name text NOT NULL DEFAULT '',
  groom_name text NOT NULL DEFAULT '',
  selected_date text NOT NULL DEFAULT '',
  custom_text text NOT NULL DEFAULT '',
  album_details jsonb NOT NULL DEFAULT '[]'::jsonb,
  sent_to text NOT NULL DEFAULT '',
  handled boolean NOT NULL DEFAULT false,
  handled_response text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.album_selection_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to album_selection_submissions"
  ON public.album_selection_submissions
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
