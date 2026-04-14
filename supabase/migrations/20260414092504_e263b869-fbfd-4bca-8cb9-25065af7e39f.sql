
CREATE TABLE public.client_portal_references (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registered_date_time_ad TEXT NOT NULL,
  event_name TEXT NOT NULL DEFAULT '',
  entry_type TEXT NOT NULL DEFAULT 'link',
  platform TEXT NOT NULL DEFAULT '',
  link_url TEXT NOT NULL DEFAULT '',
  link_title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_portal_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to client_portal_references"
  ON public.client_portal_references
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_portal_refs_client ON public.client_portal_references (registered_date_time_ad);
