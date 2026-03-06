
-- Add photographer columns to client_deliverables
ALTER TABLE public.client_deliverables ADD COLUMN IF NOT EXISTS photographer_toggles text NOT NULL DEFAULT '';
ALTER TABLE public.client_deliverables ADD COLUMN IF NOT EXISTS photographer_notes text NOT NULL DEFAULT '';

-- Create album_types table
CREATE TABLE IF NOT EXISTS public.album_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type_name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.album_types ENABLE ROW LEVEL SECURITY;

-- RLS policy matching existing pattern
CREATE POLICY "Allow all access to album_types" ON public.album_types FOR ALL USING (true) WITH CHECK (true);

-- Seed default album types
INSERT INTO public.album_types (type_name) VALUES
  ('Magazine'),
  ('Photobook'),
  ('Canvas'),
  ('Flush Mount'),
  ('Coffee Table')
ON CONFLICT (type_name) DO NOTHING;
