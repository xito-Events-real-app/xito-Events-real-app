CREATE TABLE public.client_album_selections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registered_date_time_ad text NOT NULL,
  album_type text NOT NULL,
  album_name text NOT NULL DEFAULT '',
  photo_key text NOT NULL,
  photo_url text DEFAULT '',
  selected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(registered_date_time_ad, album_type, photo_key)
);

ALTER TABLE public.client_album_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to client_album_selections"
ON public.client_album_selections
FOR ALL
TO public
USING (true)
WITH CHECK (true);