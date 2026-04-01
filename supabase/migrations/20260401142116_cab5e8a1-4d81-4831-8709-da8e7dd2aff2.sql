CREATE TABLE public.xito_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  action_type TEXT NOT NULL DEFAULT 'upload',
  folder_path TEXT NOT NULL DEFAULT '',
  client_name TEXT NOT NULL DEFAULT '',
  event_name TEXT NOT NULL DEFAULT '',
  photographer TEXT NOT NULL DEFAULT '',
  file_count INT NOT NULL DEFAULT 0,
  total_size_bytes BIGINT NOT NULL DEFAULT 0,
  file_name TEXT NOT NULL DEFAULT '',
  is_video BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.xito_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to xito_activity_log"
  ON public.xito_activity_log
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);