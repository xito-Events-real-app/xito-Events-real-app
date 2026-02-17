ALTER TABLE public.freelancer_event_settings
  ADD COLUMN show_bride_location boolean NOT NULL DEFAULT true,
  ADD COLUMN show_groom_location boolean NOT NULL DEFAULT true;