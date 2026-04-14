CREATE TABLE public.client_pcloud_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registered_date_time_ad text NOT NULL,
  email text NOT NULL DEFAULT '',
  client_name text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_seen boolean NOT NULL DEFAULT false
);

ALTER TABLE public.client_pcloud_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to client_pcloud_emails"
  ON public.client_pcloud_emails
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);