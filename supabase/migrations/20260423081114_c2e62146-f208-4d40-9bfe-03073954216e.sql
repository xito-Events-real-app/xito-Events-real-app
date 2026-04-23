CREATE TABLE public.client_favourite_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registered_date_time_ad text NOT NULL,
  photo_key text NOT NULL,
  photo_url text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT client_favourite_photos_unique UNIQUE (registered_date_time_ad, photo_key)
);

CREATE INDEX idx_client_favourite_photos_registered ON public.client_favourite_photos(registered_date_time_ad);

ALTER TABLE public.client_favourite_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access for favourites"
ON public.client_favourite_photos
FOR ALL
TO public
USING (true)
WITH CHECK (true);