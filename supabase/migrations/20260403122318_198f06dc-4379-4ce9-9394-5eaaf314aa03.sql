
CREATE TABLE public.video_edit_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  editor_name text NOT NULL DEFAULT '',
  sender_name text NOT NULL DEFAULT '',
  sender_type text NOT NULL DEFAULT 'admin',
  message text NOT NULL DEFAULT '',
  mentions text NOT NULL DEFAULT '[]',
  tracker_row_id uuid,
  is_read boolean DEFAULT false
);

ALTER TABLE public.video_edit_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to video_edit_chat" ON public.video_edit_chat FOR ALL TO public USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_edit_chat;

CREATE TABLE public.video_edit_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  editor_name text NOT NULL DEFAULT '',
  notification_type text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  tracker_row_id uuid,
  is_read boolean DEFAULT false
);

ALTER TABLE public.video_edit_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to video_edit_notifications" ON public.video_edit_notifications FOR ALL TO public USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_edit_notifications;
