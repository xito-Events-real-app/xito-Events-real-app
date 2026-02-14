-- Drop old unique constraint and add a better one that includes event_date_ad
ALTER TABLE public.freelancer_assignments DROP CONSTRAINT IF EXISTS freelancer_assignments_registered_date_time_ad_event_key;
ALTER TABLE public.freelancer_assignments ADD CONSTRAINT freelancer_assignments_unique_key UNIQUE(registered_date_time_ad, event, event_date_ad);