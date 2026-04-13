
CREATE TABLE public.album_dashboard_cache (
  registered_date_time_ad text NOT NULL PRIMARY KEY,
  xito_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  pcloud_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.album_dashboard_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to album_dashboard_cache"
  ON public.album_dashboard_cache
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
