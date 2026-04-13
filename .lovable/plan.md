

# Album Submission Alert — Admin Popup

## Overview
When a client completes the album wizard and sends WhatsApp, save submission details to DB. On admin app open, show a popup with details and action options. Only appears inside `AdminOnlyFeatures` (same place as other popups), never on public routes.

## Database

**New table: `album_selection_submissions`**

| Column | Type | Default |
|--------|------|---------|
| id | uuid | gen_random_uuid() |
| registered_date_time_ad | text | required |
| client_name | text | '' |
| bride_name | text | '' |
| groom_name | text | '' |
| selected_date | text | '' |
| custom_text | text | '' |
| album_details | jsonb | '[]' |
| sent_to | text | '' |
| handled | boolean | false |
| handled_response | text | '' |
| created_at | timestamptz | now() |

RLS: Allow all access (matches existing pattern).

## Changes

### 1. `AlbumLockWizard.tsx`
- Accept `clientName` and `registeredDateTimeAD` as new props
- On WhatsApp contact click, insert row into `album_selection_submissions` before opening WhatsApp
- Store bride/groom names, date, custom text, album counts, and `sent_to` (contact name)

### 2. New: `src/components/suite/AlbumSubmissionAlert.tsx`
- On mount, query `album_selection_submissions` where `handled = false`
- If any unhandled rows exist, show Dialog for first one with:
  - Client name, bride name, groom name, selected date, custom album text
  - **Sent to: {name}** in large bold text (text-4xl for the contact name)
  - Four buttons:
    1. **"Yes, I have sent them for design"** → `handled = true` in DB, popup gone forever
    2. **"I haven't sent them for design"** → dismiss (reappears next app open)
    3. **"I don't know"** → dismiss (reappears next app open)
    4. **"Copy original files"** → navigate to `/client-tracker/client/{registeredDateTimeAD}` then dismiss

### 3. `App.tsx` — Inside `AdminOnlyFeatures`
- Add `<AlbumSubmissionAlert />` — this ensures it only renders for logged-in admin users and never on public routes (`/client-portal`, `/crew-schedule`, `/editor-portal`, `/client-form`, `/login`)

### 4. `PortalMyAlbum.tsx` + `ClientPortal.tsx`
- Pass `clientName` and `registeredDateTimeAD` through to `AlbumLockWizard`

## Route gating
The existing `AdminOnlyFeatures` wrapper already checks `isPublicRoute()` and returns `null` for all public prefixes. Placing the alert inside this wrapper guarantees it never appears on client, editor, or freelancer portals.

