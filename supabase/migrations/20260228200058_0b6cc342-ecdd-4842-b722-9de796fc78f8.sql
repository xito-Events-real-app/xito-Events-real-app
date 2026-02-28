
-- =============================================
-- STORAGE DEVICES TABLE
-- =============================================
CREATE TABLE public.storage_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_type text NOT NULL DEFAULT 'HARD_DRIVE',
  device_name text NOT NULL DEFAULT '',
  pc_drive_letter text,
  total_storage_gb numeric NOT NULL DEFAULT 0,
  used_storage_gb numeric NOT NULL DEFAULT 0,
  remaining_storage_gb numeric GENERATED ALWAYS AS (total_storage_gb - used_storage_gb) STORED,
  health_percent integer NOT NULL DEFAULT 100,
  safety_status text NOT NULL DEFAULT 'SAFE',
  speed_rating integer NOT NULL DEFAULT 3,
  purchase_date_ad text DEFAULT '',
  purchase_date_bs text DEFAULT '',
  price_npr numeric DEFAULT 0,
  purchased_from text DEFAULT '',
  synced_to_sheet boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.storage_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to storage_devices"
  ON public.storage_devices FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================
-- FILES MANAGEMENT TABLE
-- =============================================
CREATE TABLE public.files_management (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registered_date_time_ad text NOT NULL DEFAULT '',
  registered_date_bs text DEFAULT '',
  client_name text DEFAULT '',
  event_name text DEFAULT '',
  event_year text DEFAULT '',
  event_month text DEFAULT '',
  event_day text DEFAULT '',
  event_date_ad text DEFAULT '',
  freelancer_type text DEFAULT '',
  freelancer_name text DEFAULT '',
  storage_type text DEFAULT '',
  storage_device_id uuid REFERENCES public.storage_devices(id) ON DELETE SET NULL,
  year_event_folder text DEFAULT '',
  category text DEFAULT '',
  client_folder_name text DEFAULT '',
  event_folder_name text DEFAULT '',
  side text DEFAULT '',
  card_label text DEFAULT '',
  size_gb numeric DEFAULT 0,
  number_of_items integer DEFAULT 0,
  format_type text DEFAULT '',
  who_copied text DEFAULT '',
  reconfirmation boolean DEFAULT false,
  double_backup boolean DEFAULT false,
  double_backup_path text DEFAULT '',
  triple_backup boolean DEFAULT false,
  triple_backup_path text DEFAULT '',
  drive_upload boolean DEFAULT false,
  drive_upload_path text DEFAULT '',
  deleted_or_not boolean DEFAULT false,
  final_generated_path text DEFAULT '',
  synced_to_sheet boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.files_management ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to files_management"
  ON public.files_management FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================
-- TRIGGER: Auto-update storage used_storage_gb
-- =============================================
CREATE OR REPLACE FUNCTION public.update_storage_device_usage()
RETURNS TRIGGER AS $$
DECLARE
  target_device_id uuid;
BEGIN
  -- Determine which device to update
  IF TG_OP = 'DELETE' THEN
    target_device_id := OLD.storage_device_id;
  ELSE
    target_device_id := NEW.storage_device_id;
  END IF;

  -- Also update old device if device changed
  IF TG_OP = 'UPDATE' AND OLD.storage_device_id IS DISTINCT FROM NEW.storage_device_id AND OLD.storage_device_id IS NOT NULL THEN
    UPDATE public.storage_devices
    SET used_storage_gb = COALESCE((
      SELECT SUM(size_gb) FROM public.files_management
      WHERE storage_device_id = OLD.storage_device_id AND deleted_or_not = false
    ), 0),
    updated_at = now()
    WHERE id = OLD.storage_device_id;
  END IF;

  -- Update current device
  IF target_device_id IS NOT NULL THEN
    UPDATE public.storage_devices
    SET used_storage_gb = COALESCE((
      SELECT SUM(size_gb) FROM public.files_management
      WHERE storage_device_id = target_device_id AND deleted_or_not = false
    ), 0),
    updated_at = now()
    WHERE id = target_device_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_storage_usage_on_file_change
AFTER INSERT OR UPDATE OF size_gb, storage_device_id, deleted_or_not OR DELETE
ON public.files_management
FOR EACH ROW
EXECUTE FUNCTION public.update_storage_device_usage();

-- =============================================
-- TRIGGER: Auto-update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_storage_devices_updated_at
BEFORE UPDATE ON public.storage_devices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_files_management_updated_at
BEFORE UPDATE ON public.files_management
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ENABLE REALTIME
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.storage_devices;
ALTER PUBLICATION supabase_realtime ADD TABLE public.files_management;
