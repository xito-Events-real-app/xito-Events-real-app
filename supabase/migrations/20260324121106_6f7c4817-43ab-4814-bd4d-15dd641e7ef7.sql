
CREATE TABLE public.potential_deletes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  device_type text NOT NULL DEFAULT '',
  device_name text NOT NULL DEFAULT '',
  client_name text DEFAULT '',
  responsibility text DEFAULT '',
  notes text DEFAULT '',
  deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.potential_deletes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to potential_deletes"
ON public.potential_deletes
FOR ALL
TO public
USING (true)
WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public)
VALUES ('potential-deletes', 'potential-deletes', true);

CREATE POLICY "Allow public read potential-deletes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'potential-deletes');

CREATE POLICY "Allow public insert potential-deletes"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'potential-deletes');

CREATE POLICY "Allow public delete potential-deletes"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'potential-deletes');
