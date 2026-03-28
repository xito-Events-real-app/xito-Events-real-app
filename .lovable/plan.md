

## Plan: Client Portal Page ("Client Link" section)

### Overview
Build a public-facing client portal page (like the existing Crew Schedule page) that clients access via WhatsApp link. It has a mobile-first design with Facebook-style bottom tabs: **Dashboard**, **My Photos**, **My Videos**, **My Payment**.

### Architecture

```text
URL: /client-portal/:clientName/:clientId
      (clientId = registeredDateTimeAD, same pattern as /client-form/)

Public route (no auth required) — client accesses via WhatsApp link
```

### New Files

| File | Purpose |
|------|---------|
| `src/pages/ClientPortal.tsx` | Main portal page with bottom tab navigation and view toggle |
| `src/components/client-portal/PortalDashboard.tsx` | Dashboard tab content |
| `src/components/client-portal/PortalMyPhotos.tsx` | Photos tab — reuses Album section logic (iDrive E2, XitoImageViewer) |
| `src/components/client-portal/PortalMyVideos.tsx` | Videos tab — YouTube (coming soon) + pCloud video listing |
| `src/components/client-portal/PortalMyPayment.tsx` | Payment tab — coming soon |
| `src/components/client-portal/PortalBottomNav.tsx` | Facebook-style bottom navigation bar |
| `src/components/client-portal/PortalPhotoEventNav.tsx` | Event navigation bar (replaces bottom nav when viewing photos) |

### Modified Files

| File | Change |
|------|---------|
| `src/App.tsx` | Add public route `/client-portal/:clientName/:clientId` |
| `src/components/client-detail/ClientDetailSidebar.tsx` | Add "Client Link" section (id: `clientLink`, icon: `ExternalLink`) after "Album" |
| `src/pages/ClientDetail.tsx` | Add `clientLink` section rendering + link sharing dialog with recipient picker |
| `src/lib/client-contact-api.ts` | Add `getClientPortalUrl()` and `generatePortalWhatsAppMessage()` helpers |

### Detailed Design

#### 1. Sidebar Entry
- Add `{ id: 'clientLink', label: 'Client Link', icon: ExternalLink }` to `sidebarItems` after `album`
- Add `'clientLink'` to `SectionType` union

#### 2. Client Link Section (in ClientDetail.tsx)
When `activeSection === 'clientLink'`:
- Show the portal URL with copy button
- Show mobile/desktop preview toggle
- **"Send Link" button** opens a dialog asking "Send to whom?":
  - Options populated from client data + contact_details_cache:
    - Client Name + Contact No
    - Client Name + WhatsApp No  
    - Bride Name + Bride WhatsApp
    - Groom Name + Groom WhatsApp
  - Each option is a button that opens WhatsApp with the portal URL pre-filled

#### 3. Client Portal Page (`/client-portal/:clientName/:clientId`)
- **Public route** (no auth)
- Loads client data from `clients_cache` by `registeredDateTimeAD`
- Loads freelancer assignments for photo tabs
- Mobile/Desktop view toggle in header (like the freelancer crew schedule page)

**Bottom Navigation (Facebook-style):**
- Dashboard | My Photos | My Videos | My Payment
- Fixed at bottom, icons + labels

#### 4. Dashboard Tab
- Wedding Tales Nepal branding header
- Client name, event dates, days remaining countdown
- Event list with venue info (from `event_details_cache`)

#### 5. My Photos Tab
- When entered, bottom nav switches to **event navigation**: `← PRE+RECEPTION (Prasan) →`
  - Each button = `EventName (Photographer First Name)`
  - Left/right arrows to cycle through events
- Reuses exact same logic as `AlbumSection.tsx`:
  - Same `majorityYearMonth` calculation
  - Same S3 prefix: `{MONTH} EVENTS {YEAR}/{clientName}/Photos/{event}/{photographer}/`
  - Same `listE2Folder` → `getE2FileUrls` batched loading
  - Same `XitoImageViewer` for full-screen viewing
  - Same list cache ref pattern

#### 6. My Videos Tab
- Top sub-nav with two tabs: **YouTube** (icon) | **pCloud** (icon)
- **YouTube**: "Coming Soon" placeholder
- **pCloud**: 
  - Fetches videos from pCloud path: `/WEDDING TALES NEPAL/{monthYear}/{clientName}/Videos/`
  - Lists only video files (`.mp4`, `.mov`, `.mkv`, `.avi`)
  - Shows video thumbnails via `getPCloudThumbsBatch`
  - Each video has a download button via `getPCloudFileLink`
  - **Security**: The edge function call includes the `clientId` parameter and the component only constructs paths for that specific client — no directory traversal possible

#### 7. My Payment Tab
- "Coming Soon" placeholder with Wedding Tales Nepal branding

### Technical Details

- **Photo loading**: Identical to `AlbumSection.tsx` — uses `listE2Folder`, `getE2FileUrls`, `XitoImageViewer`, batch URL fetching (initial 12), load-more pattern
- **Video loading**: Uses `listPCloudFolderByPath` to list `/WEDDING TALES NEPAL/{month}/{client}/Videos/` then `getPCloudFileLink` for download URLs
- **No auth required**: Page reads directly from `clients_cache`, `freelancer_assignments`, `event_details_cache` (all have public RLS)
- **Portal URL format**: `https://wtnclienttracker.lovable.app/client-portal/{nameSlug}/{encodedClientId}`

