

# Client Portal: References & Demands Feature

## Overview
Replace the "Your Events" section on the portal dashboard with a styled "Add My References" button. This opens a new portal tab where clients can add reference links (Instagram, YouTube, Pinterest, etc.) and describe their demands — both generally and per-event.

## Database

**New table: `client_portal_references`**
```sql
id uuid PK default gen_random_uuid()
registered_date_time_ad text NOT NULL
event_name text NOT NULL DEFAULT '' -- empty string = general
entry_type text NOT NULL DEFAULT 'link' -- 'link' | 'demand'
platform text NOT NULL DEFAULT '' -- instagram, youtube, pinterest, tiktok, website, other
link_url text NOT NULL DEFAULT ''
link_title text NOT NULL DEFAULT ''
description text NOT NULL DEFAULT '' -- used for demand text or link notes
created_at timestamptz NOT NULL DEFAULT now()
```

RLS: Allow all access (same pattern as other tables). Single table handles both general and per-event, both links and demands.

## UI Changes

### 1. PortalDashboard.tsx — Replace "Your Events" section
- Keep the events cards as-is (venue/crew info is useful)
- **Add a new button below the events** styled like the "Complete your details" banner:
  - Title: **"Add My References"**
  - Subtitle: *"Share your inspiration photos, videos & ideas so our crew can capture your vision perfectly"*
  - Rose-gold gradient, arrow icon, tappable
  - Clicking it calls `onGoToReferences()` → switches to new `'references'` tab

### 2. New PortalBottomNav tab
- Add `'references'` to `PortalTab` type
- Add a new nav item with a `Sparkles` or `Bookmark` icon labeled "Ideas"

### 3. New component: `PortalMyReferences.tsx`
- **Tab bar at top**: "General" + one tab per event name
- **Each tab shows two sections**:

**References Section:**
- List of saved links with platform icon, title, and "open" button
- "Add Reference" button opens a mini form: platform selector (Instagram, YouTube, Pinterest, TikTok, Website, Other) + URL + optional title
- Delete button on each link

**Demands Section:**
- List of saved demand entries (text cards)
- "Add a Note" button with textarea
- Delete button on each

- **General tab info**: small text explaining "These apply to your entire wedding"
- **Event tabs info**: "These are specific to [Event Name]"

### 4. ClientPortal.tsx
- Add `references` tab rendering
- Pass `registeredDateTimeAD` and `events` to the new component

### 5. Data API: `client-portal-references-api.ts`
- `getReferences(registeredDateTimeAD)` — fetch all
- `addReference(data)` — insert
- `deleteReference(id)` — delete
- All use Supabase client directly

## Files Changed
- **New migration** — `client_portal_references` table
- **New file**: `src/lib/client-portal-references-api.ts`
- **New file**: `src/components/client-portal/PortalMyReferences.tsx`
- **Edit**: `src/components/client-portal/PortalDashboard.tsx` — add references button
- **Edit**: `src/components/client-portal/PortalBottomNav.tsx` — add tab
- **Edit**: `src/pages/ClientPortal.tsx` — wire new tab

