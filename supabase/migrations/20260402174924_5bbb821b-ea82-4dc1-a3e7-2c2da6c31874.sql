CREATE TABLE public.youtube_upload_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL DEFAULT '',
  event_name text NOT NULL DEFAULT '',
  edit_type text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  playlist_id text DEFAULT '',
  video_file_name text NOT NULL DEFAULT '',
  file_size_bytes bigint NOT NULL DEFAULT 0,
  bytes_uploaded bigint NOT NULL DEFAULT 0,
  upload_uri text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  youtube_video_id text DEFAULT '',
  youtube_link text DEFAULT '',
  started_by text DEFAULT '',
  tracker_row_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.youtube_upload_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access" ON public.youtube_upload_sessions FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.youtube_upload_sessions;