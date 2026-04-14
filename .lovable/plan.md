

# Auto-Invite pCloud Emails to Client Folders

## Overview
When a client adds an email in the "pCloud Sharing" section, automatically call pCloud's `sharefolder` API to invite that email to the client's folder under `/WEDDING TALES NEPAL/{monthYear}/{clientName}`. Also add a manual "Invite" button on the admin notification popup as a fallback.

## How It Works
pCloud's `/sharefolder` API accepts `folderid` (or `path`) + `mail` and sends a share invitation. The invited user gets an email from pCloud to accept the shared folder. No pCloud account is required upfront — they can create one when accepting.

## Changes

### 1. Edge Function: `supabase/functions/pcloud-api/index.ts`
- Add a new action `'sharefolder'` that calls `https://api.pcloud.com/sharefolder` with:
  - `path` — the client's pCloud folder path (e.g., `/WEDDING TALES NEPAL/2082-10/ClientName`)
  - `mail` — the email to invite
  - `permissions` — read-only (0) by default
- Returns success/error status

### 2. `src/lib/pcloud-api.ts`
- Add new function: `sharePCloudFolder(folderPath: string, email: string): Promise<void>`
- Calls the edge function with action `'sharefolder'`

### 3. `src/components/client-portal/PortalMyDetails.tsx`
- After successfully saving a new email to the database, automatically call `sharePCloudFolder()` with the client's pCloud folder path
- The folder path is built from client data: `/WEDDING TALES NEPAL/{monthYear}/{clientName}`
- Show a subtle toast on success ("Invitation sent") or silently log errors (don't block the email save)

### 4. `src/components/shared/PCloudEmailNotificationPopup.tsx`
- Add an "Invite to pCloud" button next to each email entry as a manual fallback
- Calls the same `sharePCloudFolder()` function
- Shows success/error feedback

### 5. Client folder path resolution
- Need `client_name`, `event_month`, and `event_year` from `clients_cache` to build the path
- In `PortalMyDetails`, these are already available from props (`clientData`)
- In the notification popup, fetch client info alongside the email query

## Technical Notes
- pCloud `sharefolder` requires the folder to already exist — if it doesn't, the invite silently fails (acceptable; folders are synced separately)
- The share invitation email comes from pCloud directly — no custom email needed
- `permissions: 0` = read-only access (clients can view but not modify)
- If the email isn't a pCloud user yet, pCloud holds the invitation until they register

## Files Changed
- `supabase/functions/pcloud-api/index.ts` — add `sharefolder` action
- `src/lib/pcloud-api.ts` — add `sharePCloudFolder()` helper
- `src/components/client-portal/PortalMyDetails.tsx` — auto-invite on email add
- `src/components/shared/PCloudEmailNotificationPopup.tsx` — manual invite button

