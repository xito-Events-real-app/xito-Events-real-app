-- Create the master questions table
CREATE TABLE public.xito_global_event_details_questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question text NOT NULL DEFAULT ''::text,
  sub_question text NOT NULL DEFAULT ''::text,
  dropdown_enabled boolean NOT NULL DEFAULT false,
  dropdown_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  text_input_enabled boolean NOT NULL DEFAULT false,
  number_input_enabled boolean NOT NULL DEFAULT false,
  number_input_hint text NOT NULL DEFAULT ''::text,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.xito_global_event_details_questions ENABLE ROW LEVEL SECURITY;

-- Authenticated full access
CREATE POLICY "Authenticated access only"
ON public.xito_global_event_details_questions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Indexes
CREATE INDEX idx_xito_global_event_details_questions_sort_order
  ON public.xito_global_event_details_questions(sort_order);

CREATE INDEX idx_xito_global_event_details_questions_tags
  ON public.xito_global_event_details_questions USING GIN(tags);

-- Auto-update updated_at
CREATE TRIGGER update_xito_global_event_details_questions_updated_at
BEFORE UPDATE ON public.xito_global_event_details_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();