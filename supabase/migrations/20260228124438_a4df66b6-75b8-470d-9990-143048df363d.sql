-- Add unique constraint on event_details_cache for upsert
ALTER TABLE public.event_details_cache
ADD CONSTRAINT event_details_cache_registered_event_idx
UNIQUE (registered_date_time_ad, event_index);

-- Add unique constraint on freelancer_assignments for upsert
ALTER TABLE public.freelancer_assignments
ADD CONSTRAINT freelancer_assignments_registered_event_date
UNIQUE (registered_date_time_ad, event, event_date_ad);

-- Add unique constraint on vendors_cache for upsert
ALTER TABLE public.vendors_cache
ADD CONSTRAINT vendors_cache_row_number_unique
UNIQUE (row_number);