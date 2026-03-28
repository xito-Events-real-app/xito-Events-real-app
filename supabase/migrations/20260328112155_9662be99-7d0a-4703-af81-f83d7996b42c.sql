CREATE TABLE public.pcloud_folder_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_path text NOT NULL UNIQUE,
  folder_name text NOT NULL DEFAULT '',
  size_bytes bigint NOT NULL DEFAULT 0,
  file_count integer NOT NULL DEFAULT 0,
  calculated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pcloud_folder_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to pcloud_folder_sizes"
  ON public.pcloud_folder_sizes
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);