ALTER TABLE potential_deletes 
  ADD COLUMN delete_approval text DEFAULT '' NOT NULL,
  ADD COLUMN approved_by text DEFAULT '' NOT NULL,
  ADD COLUMN comments text DEFAULT '' NOT NULL,
  ADD COLUMN permanently_deleted_at timestamptz DEFAULT NULL;