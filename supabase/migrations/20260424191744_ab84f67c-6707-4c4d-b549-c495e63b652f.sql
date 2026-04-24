ALTER TABLE public.photo_edit_tracker
  ADD COLUMN IF NOT EXISTS photographer_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS photographer_role text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS photographer_side text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_photo_edit_tracker_photographer
  ON public.photo_edit_tracker (photographer_role, photographer_name);

UPDATE public.photo_edit_tracker
   SET deleted = true,
       synced_to_sheet = false,
       updated_at = now()
 WHERE deleted = false
   AND (
     edit_type ILIKE 'all photos'
     OR edit_type ILIKE 'all_photos'
   );