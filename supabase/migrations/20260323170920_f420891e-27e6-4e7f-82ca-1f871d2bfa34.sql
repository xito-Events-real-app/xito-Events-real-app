-- Soft-delete duplicate rows: keep earliest created_at per unique combo
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY registered_date_time_ad, event_name, COALESCE(sub_event_name, ''), COALESCE(edit_type, '')
           ORDER BY created_at ASC
         ) AS rn
  FROM video_edit_tracker
  WHERE deleted = false
)
UPDATE video_edit_tracker
SET deleted = true, synced_to_sheet = false, updated_at = now()
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Soft-delete future event rows that shouldn't be in queue
UPDATE video_edit_tracker
SET deleted = true, synced_to_sheet = false, updated_at = now()
WHERE deleted = false
  AND event_date_ad > CURRENT_DATE::text
  AND video_edit_status = 'QUEUE';

-- Add unique partial index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_video_edit_tracker_unique_active
ON video_edit_tracker (registered_date_time_ad, event_name, COALESCE(sub_event_name, ''), COALESCE(edit_type, ''))
WHERE deleted = false;