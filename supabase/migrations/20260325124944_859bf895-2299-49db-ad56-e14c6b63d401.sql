
-- Create edited_files table
CREATE TABLE public.edited_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registered_date_time_ad text NOT NULL,
  client_name text NOT NULL DEFAULT '',
  file_type text NOT NULL DEFAULT 'photo',
  event_name text NOT NULL DEFAULT '',
  folder_event_name text NOT NULL DEFAULT '',
  side_folder text NOT NULL DEFAULT '',
  photographer_name text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  file_path text NOT NULL DEFAULT '',
  storage_path text NOT NULL DEFAULT '',
  file_size_bytes bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT '',
  upload_status text NOT NULL DEFAULT 'uploading',
  upload_progress integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.edited_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to edited_files"
  ON public.edited_files FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create edited_files_links table
CREATE TABLE public.edited_files_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registered_date_time_ad text NOT NULL,
  client_name text NOT NULL DEFAULT '',
  link_type text NOT NULL DEFAULT '',
  link_url text NOT NULL DEFAULT '',
  link_title text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.edited_files_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to edited_files_links"
  ON public.edited_files_links FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('edited-files', 'edited-files', true);

-- Storage RLS policies
CREATE POLICY "Allow public read edited-files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'edited-files');

CREATE POLICY "Allow public insert edited-files"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'edited-files');

CREATE POLICY "Allow public update edited-files"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'edited-files');

CREATE POLICY "Allow public delete edited-files"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'edited-files');
