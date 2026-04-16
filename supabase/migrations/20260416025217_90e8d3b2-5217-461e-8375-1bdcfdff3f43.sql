ALTER TABLE public.event_details_cache
  ADD COLUMN IF NOT EXISTS bride_start_time text DEFAULT '',
  ADD COLUMN IF NOT EXISTS bride_end_time text DEFAULT '',
  ADD COLUMN IF NOT EXISTS groom_start_time text DEFAULT '',
  ADD COLUMN IF NOT EXISTS groom_end_time text DEFAULT '';