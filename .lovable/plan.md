

# pCloud Emails Feature in Client Portal

## Overview
Add a "pCloud Sharing" section to the My Profile landing page where clients can add up to 10 email addresses. These emails are used later to invite them to pCloud folders. When a client adds an email, a notification popup appears on the admin side (Suite/Client Detail page) showing the client name and new email, with a copy button. The popup appears max 3 times, every 6 hours.

## Database

**New table: `client_pcloud_emails`**
```sql
id uuid PK default gen_random_uuid()
registered_date_time_ad text NOT NULL
email text NOT NULL DEFAULT ''
client_name text NOT NULL DEFAULT ''
created_at timestamptz NOT NULL DEFAULT now()
is_seen boolean NOT NULL DEFAULT false
```
RLS: Allow all access (same pattern as other tables).

## Changes

### 1. `src/components/client-portal/PortalMyDetails.tsx`
- Add a third button on the landing page below Bride/Groom: **"pCloud Sharing"** with a cloud/pCloud icon (using `CloudUpload` from lucide), purple gradient theme
- Shows count of emails added (e.g., "3/10")
- When tapped, opens a form view with:
  - Sticky header (Back + title)
  - List of saved emails with delete buttons
  - "Add Email" input + button (max 10)
  - Small explanation text: "Add email addresses to be invited to your photo/video folders"
- Saves to `client_pcloud_emails` table

### 2. `src/components/shared/PCloudEmailNotificationPopup.tsx` (new)
- Queries `client_pcloud_emails` where `is_seen = false`
- Shows a dialog with client name + email entries + copy button for each
- Marks entries as `is_seen = true` when dismissed
- localStorage key tracks show count and timing: max 3 times, every 6 hours
- Copy button copies the email to clipboard

### 3. `src/components/suite/DesktopSuiteLanding.tsx` / `MobileSuiteLanding.tsx`
- Render `<PCloudEmailNotificationPopup />` on the main landing page

### 4. Dashboard card (PortalDashboard.tsx)
- Add a small pCloud icon indicator on the profile completion section showing email count

## Files
- **New migration** — `client_pcloud_emails` table
- **New**: `src/components/shared/PCloudEmailNotificationPopup.tsx`
- **Edit**: `src/components/client-portal/PortalMyDetails.tsx` — add pCloud emails section
- **Edit**: `src/components/client-portal/PortalDashboard.tsx` — add pCloud email count indicator
- **Edit**: `src/components/suite/MobileSuiteLanding.tsx` — render notification popup
- **Edit**: `src/components/suite/DesktopSuiteLanding.tsx` — render notification popup

