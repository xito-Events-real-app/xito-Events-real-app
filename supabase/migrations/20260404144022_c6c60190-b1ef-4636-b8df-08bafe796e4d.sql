
CREATE TABLE public.xito_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  transfer_type text NOT NULL DEFAULT 'note',
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  file_url text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  file_size_bytes bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  url_description text NOT NULL DEFAULT '',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

ALTER TABLE public.xito_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to xito_transfers"
  ON public.xito_transfers
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.xito_transfers;

INSERT INTO storage.buckets (id, name, public)
VALUES ('xito-transfers', 'xito-transfers', true);

CREATE POLICY "Allow all access to xito-transfers bucket"
  ON storage.objects
  FOR ALL
  TO public
  USING (bucket_id = 'xito-transfers')
  WITH CHECK (bucket_id = 'xito-transfers');
