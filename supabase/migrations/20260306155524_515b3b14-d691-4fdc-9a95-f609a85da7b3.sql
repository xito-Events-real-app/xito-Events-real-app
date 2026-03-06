
-- Add unique constraint for upsert composite key
ALTER TABLE public.client_deliverables 
  ADD CONSTRAINT client_deliverables_composite_key 
  UNIQUE (registered_date_time_ad, event_name, section, deliverable_type);
