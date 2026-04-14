

# Security Fix: Protect Your App Data

## The Problem

There are **two separate issues** here:

### Issue 1: UI Access (Likely a false alarm)
When YOU trim the URL to just `https://business.xitoevents.com`, you see the dashboard because **you are already logged in** in that browser. Your auth session is stored in the browser. On someone else's browser (who has never logged in), they WILL see the login screen — the `ProtectedRoute` component correctly redirects unauthenticated users to `/login`.

You can test this yourself: open an **incognito/private window** and visit `https://business.xitoevents.com` — you should see the login page.

### Issue 2: Data Access (This IS a real problem)
All your database tables use `"Allow all access"` RLS policies (`USING (true)`). This means **anyone who knows the database URL and anon key** (which are visible in your app's JavaScript bundle) can directly query ALL your client data via the API — bypassing the UI login entirely. This is a genuine security risk.

## The Fix

### Step 1: Restrict all table RLS policies to authenticated users only
Update every table's RLS policy from:
```sql
-- Current (DANGEROUS): anyone can read
FOR ALL USING (true)
```
to:
```sql
-- Fixed: only logged-in users can access
FOR ALL TO authenticated USING (true) WITH CHECK (true)
```

This is a single migration that drops the old "allow all" policies and creates new "authenticated only" policies for all admin tables.

### Step 2: Keep public tables accessible for portals
Tables that need to be accessed by public-facing pages (client portal, crew schedule, editor portal, client form) will keep open policies but only for specific operations:
- `contact_details_cache` — INSERT for client form submissions
- `client_album_selections` — SELECT/INSERT/UPDATE/DELETE for album selection
- `client_portal_references` — SELECT/INSERT for portal references
- `album_selection_submissions` — INSERT for submissions
- `portal_hidden_videos` — SELECT for portal
- `client_pcloud_emails` — SELECT/INSERT for pCloud sharing

All other tables (clients_cache, event_details_cache, freelancers_cache, files_management, accounts, etc.) become **authenticated-only**.

### Step 3: Verify login screen works on published domain
After the migration, even if someone extracts the API keys from the JavaScript bundle, they cannot query any protected table without a valid login session.

## Files to change
1. **New database migration** — Drop ~30 "Allow all" policies, replace with "authenticated only" policies
2. No code changes needed — the Supabase client already sends the auth token automatically when a user is logged in

## Impact
- Your admin dashboard continues to work exactly as before (you're logged in)
- Public portals continue to work (their specific tables remain accessible)
- Anyone without a login can no longer access your business data through any means

