
CREATE TABLE public.youtube_video_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id text NOT NULL,
  playlist_id text,
  author text NOT NULL,
  comment text NOT NULL,
  tracker_row_id uuid REFERENCES public.video_edit_tracker(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.youtube_video_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to youtube_video_comments"
  ON public.youtube_video_comments
  FOR ALL TO public
  USING (true) WITH CHECK (true);
