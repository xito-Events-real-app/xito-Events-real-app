
CREATE TABLE public.lagan_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bs_year integer NOT NULL,
  bs_month integer NOT NULL,
  bs_day integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bs_year, bs_month, bs_day)
);

ALTER TABLE public.lagan_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to lagan_dates"
  ON public.lagan_dates
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
