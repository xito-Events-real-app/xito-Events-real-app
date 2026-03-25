ALTER TABLE public.video_edit_tracker ADD COLUMN is_playing boolean NOT NULL DEFAULT false;
ALTER TABLE public.video_edit_tracker ADD COLUMN playing_since timestamptz DEFAULT NULL;