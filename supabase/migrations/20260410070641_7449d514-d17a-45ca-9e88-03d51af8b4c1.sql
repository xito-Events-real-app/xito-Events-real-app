
CREATE TABLE public.portal_hidden_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registered_date_time_ad TEXT NOT NULL,
  video_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (registered_date_time_ad, video_id)
);

ALTER TABLE public.portal_hidden_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to portal_hidden_videos"
  ON public.portal_hidden_videos
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
