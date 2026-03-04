ALTER TABLE public.files_management
  ADD COLUMN IF NOT EXISTS backup_1_device_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS backup_2_path text DEFAULT '',
  ADD COLUMN IF NOT EXISTS backup_2_device_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS backup_3_path text DEFAULT '',
  ADD COLUMN IF NOT EXISTS backup_3_device_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS drive_link text DEFAULT '',
  ADD COLUMN IF NOT EXISTS notes text DEFAULT '',
  ADD COLUMN IF NOT EXISTS confirmed boolean DEFAULT false;