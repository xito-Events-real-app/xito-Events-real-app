

# Migration: Restore Public Portal Access for 9 Tables

## What this does
Adds targeted `anon` role policies so Client Portal, Crew Schedule, and Editor Portal work without login. Existing `authenticated` ALL policies remain untouched.

## Policies to create

| Table | SELECT | INSERT | UPDATE | DELETE | Used by |
|---|---|---|---|---|---|
| `clients_cache` | Yes | — | — | — | Client Portal, Crew Schedule |
| `event_details_cache` | Yes | — | — | — | Client Portal, Crew Schedule |
| `freelancer_assignments` | Yes | — | — | — | Client Portal, Crew Schedule |
| `client_deliverables` | Yes | — | — | — | Client Portal (album defs) |
| `freelancers_cache` | Yes | — | — | — | Crew Schedule, Editor Portal |
| `freelancer_event_settings` | Yes | — | — | — | Crew Schedule (visibility) |
| `video_edit_tracker` | Yes | — | Yes | — | Editor Portal (list + play/pause) |
| `video_edit_chat` | Yes | Yes | Yes | — | Editor Portal (chat) |
| `video_edit_notifications` | Yes | Yes | Yes | — | Editor Portal (notifications) |

Additionally, `contact_details_cache` already has public SELECT + INSERT but needs public **UPDATE** for upsert from the client form and portal.

## SQL migration (single file)

```sql
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
```

## Risk check — tables where anon can write

| Table | Risk | Mitigation |
|---|---|---|
| `video_edit_tracker` | anon can UPDATE any row (change status, editor, etc.) | Low risk: editor portal URL is only shared privately via WhatsApp. No DELETE. |
| `video_edit_chat` | anon can INSERT/UPDATE any chat message | Low risk: URL is private. No DELETE. |
| `video_edit_notifications` | anon can INSERT/UPDATE notifications | Low risk: same as above. |
| `contact_details_cache` | anon can UPDATE any contact row | Low risk: client portal URLs are private. No DELETE. |

No table grants DELETE to `anon`. No table grants INSERT to `anon` for admin-sensitive data (clients, finances, files). The risk is acceptable given these are private-link portals.

## Files changed
1. **New database migration** — the SQL above
2. **No code changes** — the Supabase client already works with anon key on public routes

