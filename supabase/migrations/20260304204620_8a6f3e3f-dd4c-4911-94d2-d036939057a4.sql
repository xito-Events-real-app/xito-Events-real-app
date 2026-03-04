ALTER TABLE public.storage_devices
  ADD COLUMN cloud_type text DEFAULT '',
  ADD COLUMN expiry_date_ad text DEFAULT '';