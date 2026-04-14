-- 1. Read-only tables (SELECT for anon)
CREATE POLICY "Public select for portals" ON public.clients_cache FOR SELECT TO anon USING (true);
CREATE POLICY "Public select for portals" ON public.event_details_cache FOR SELECT TO anon USING (true);
CREATE POLICY "Public select for portals" ON public.freelancer_assignments FOR SELECT TO anon USING (true);
CREATE POLICY "Public select for portals" ON public.client_deliverables FOR SELECT TO anon USING (true);
CREATE POLICY "Public select for portals" ON public.freelancers_cache FOR SELECT TO anon USING (true);
CREATE POLICY "Public select for portals" ON public.freelancer_event_settings FOR SELECT TO anon USING (true);

-- 2. Video edit tracker (SELECT + UPDATE for editor play/pause)
CREATE POLICY "Public select for editor portal" ON public.video_edit_tracker FOR SELECT TO anon USING (true);
CREATE POLICY "Public update for editor portal" ON public.video_edit_tracker FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 3. Video edit chat (SELECT + INSERT + UPDATE for messaging)
CREATE POLICY "Public select for editor chat" ON public.video_edit_chat FOR SELECT TO anon USING (true);
CREATE POLICY "Public insert for editor chat" ON public.video_edit_chat FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public update for editor chat" ON public.video_edit_chat FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 4. Video edit notifications (SELECT + INSERT + UPDATE)
CREATE POLICY "Public select for editor notifications" ON public.video_edit_notifications FOR SELECT TO anon USING (true);
CREATE POLICY "Public insert for editor notifications" ON public.video_edit_notifications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Public update for editor notifications" ON public.video_edit_notifications FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 5. Contact details — add missing public UPDATE for upsert
CREATE POLICY "Public update contact details" ON public.contact_details_cache FOR UPDATE TO anon USING (true) WITH CHECK (true);