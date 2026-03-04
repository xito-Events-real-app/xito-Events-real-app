ALTER TABLE public.files_management
  ADD COLUMN IF NOT EXISTS backup_1_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS backup_2_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS backup_3_recorded_at timestamptz;