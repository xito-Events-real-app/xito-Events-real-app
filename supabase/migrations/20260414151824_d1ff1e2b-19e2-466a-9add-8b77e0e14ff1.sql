
-- ============================================================
-- DROP all existing "Allow all" policies
-- ============================================================
DROP POLICY IF EXISTS "Allow all access to clients_cache" ON public.clients_cache;
DROP POLICY IF EXISTS "Allow all access to freelancers_cache" ON public.freelancers_cache;
DROP POLICY IF EXISTS "Allow all access to files_management" ON public.files_management;
DROP POLICY IF EXISTS "Allow all access to storage_devices" ON public.storage_devices;
DROP POLICY IF EXISTS "Allow all access to vendors_cache" ON public.vendors_cache;
DROP POLICY IF EXISTS "Allow all access to logistics_vendors_cache" ON public.logistics_vendors_cache;
DROP POLICY IF EXISTS "Allow all access to logistics_types_cache" ON public.logistics_types_cache;
DROP POLICY IF EXISTS "Allow all access to dropdowns_cache" ON public.dropdowns_cache;
DROP POLICY IF EXISTS "Allow all access to edited_files" ON public.edited_files;
DROP POLICY IF EXISTS "Allow all access to edited_files_links" ON public.edited_files_links;
DROP POLICY IF EXISTS "Allow all access to freelancer_assignments" ON public.freelancer_assignments;
DROP POLICY IF EXISTS "Allow all access to freelancer_event_settings" ON public.freelancer_event_settings;
DROP POLICY IF EXISTS "Allow all access to event_details_cache" ON public.event_details_cache;
DROP POLICY IF EXISTS "Allow all access to video_edit_tracker" ON public.video_edit_tracker;
DROP POLICY IF EXISTS "Allow all access to video_edit_chat" ON public.video_edit_chat;
DROP POLICY IF EXISTS "Allow all access to video_edit_notifications" ON public.video_edit_notifications;
DROP POLICY IF EXISTS "Allow all access to pcloud_folder_sizes" ON public.pcloud_folder_sizes;
DROP POLICY IF EXISTS "Allow all access to potential_deletes" ON public.potential_deletes;
DROP POLICY IF EXISTS "Allow all access to lagan_dates" ON public.lagan_dates;
DROP POLICY IF EXISTS "Allow all access to album_types" ON public.album_types;
DROP POLICY IF EXISTS "Allow all access to album_copy_history" ON public.album_copy_history;
DROP POLICY IF EXISTS "Allow all access to album_dashboard_cache" ON public.album_dashboard_cache;
DROP POLICY IF EXISTS "Allow all access to xito_activity_log" ON public.xito_activity_log;
DROP POLICY IF EXISTS "Allow all access to xito_transfers" ON public.xito_transfers;
DROP POLICY IF EXISTS "Allow all access" ON public.youtube_upload_sessions;
DROP POLICY IF EXISTS "Allow all access to youtube_video_comments" ON public.youtube_video_comments;
DROP POLICY IF EXISTS "Allow all access to contact_details_cache" ON public.contact_details_cache;
DROP POLICY IF EXISTS "Allow all access to client_album_selections" ON public.client_album_selections;
DROP POLICY IF EXISTS "Allow all access to client_portal_references" ON public.client_portal_references;
DROP POLICY IF EXISTS "Allow all access to album_selection_submissions" ON public.album_selection_submissions;
DROP POLICY IF EXISTS "Allow all access to portal_hidden_videos" ON public.portal_hidden_videos;
DROP POLICY IF EXISTS "Allow all access to client_pcloud_emails" ON public.client_pcloud_emails;
DROP POLICY IF EXISTS "Allow all access to client_deliverables" ON public.client_deliverables;

-- ============================================================
-- ADMIN-ONLY tables: authenticated users only
-- ============================================================
CREATE POLICY "Authenticated access only" ON public.clients_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.freelancers_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.files_management FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.storage_devices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.vendors_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.logistics_vendors_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.logistics_types_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.dropdowns_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.edited_files FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.edited_files_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.freelancer_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.freelancer_event_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.event_details_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.video_edit_tracker FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.video_edit_chat FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.video_edit_notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.pcloud_folder_sizes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.potential_deletes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.lagan_dates FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.album_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.album_copy_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.album_dashboard_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.xito_activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.xito_transfers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.youtube_upload_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.youtube_video_comments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated access only" ON public.client_deliverables FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- PUBLIC PORTAL tables: keep accessible for client-facing pages
-- ============================================================

-- client_album_selections: full public access (album selection portal)
CREATE POLICY "Public access for album selections" ON public.client_album_selections FOR ALL USING (true) WITH CHECK (true);

-- client_portal_references: public read + insert
CREATE POLICY "Public read portal references" ON public.client_portal_references FOR SELECT USING (true);
CREATE POLICY "Public insert portal references" ON public.client_portal_references FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated update portal references" ON public.client_portal_references FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete portal references" ON public.client_portal_references FOR DELETE TO authenticated USING (true);

-- album_selection_submissions: public insert, authenticated read/update/delete
CREATE POLICY "Public insert submissions" ON public.album_selection_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated read submissions" ON public.album_selection_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated update submissions" ON public.album_selection_submissions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete submissions" ON public.album_selection_submissions FOR DELETE TO authenticated USING (true);

-- portal_hidden_videos: public read, authenticated write
CREATE POLICY "Public read hidden videos" ON public.portal_hidden_videos FOR SELECT USING (true);
CREATE POLICY "Authenticated write hidden videos" ON public.portal_hidden_videos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated delete hidden videos" ON public.portal_hidden_videos FOR DELETE TO authenticated USING (true);

-- client_pcloud_emails: public read + insert
CREATE POLICY "Public read pcloud emails" ON public.client_pcloud_emails FOR SELECT USING (true);
CREATE POLICY "Public insert pcloud emails" ON public.client_pcloud_emails FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated update pcloud emails" ON public.client_pcloud_emails FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- contact_details_cache: authenticated full + public insert (client form)
CREATE POLICY "Authenticated access contact details" ON public.contact_details_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public insert contact details" ON public.contact_details_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read contact details" ON public.contact_details_cache FOR SELECT USING (true);
