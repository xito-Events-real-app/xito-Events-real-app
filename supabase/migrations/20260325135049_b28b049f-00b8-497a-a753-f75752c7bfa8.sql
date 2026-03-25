ALTER TABLE public.edited_files
ADD COLUMN IF NOT EXISTS storage_type text NOT NULL DEFAULT 'supabase',
ADD COLUMN IF NOT EXISTS pcloud_file_id bigint DEFAULT NULL;