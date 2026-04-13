CREATE TABLE public.album_copy_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registered_date_time_ad text NOT NULL UNIQUE,
  client_name text NOT NULL DEFAULT '',
  month_folder text NOT NULL DEFAULT '',
  albums_copied jsonb NOT NULL DEFAULT '[]',
  total_copied integer NOT NULL DEFAULT 0,
  total_expected integer NOT NULL DEFAULT 0,
  errors text[] NOT NULL DEFAULT '{}',
  copied_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.album_copy_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to album_copy_history"
  ON public.album_copy_history
  FOR ALL
  USING (true)
  WITH CHECK (true);