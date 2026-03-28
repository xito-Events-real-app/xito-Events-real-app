

# Client Portal Redesign — Premium UI + Contact Form Integration

## Overview

Transform the Client Portal into a stunning, premium wedding app experience with:
1. Netflix/Instagram-grade dashboard with freelancer details in events
2. Integrated contact details form as a dedicated bottom-nav tab
3. Smart form-fill reminder on first load if contact details are incomplete
4. Required fields: Name, Contact Number, WhatsApp for both bride and groom

## Current State

- **PortalDashboard**: Basic cards with events, countdown, venue/time info
- **ClientPortal page**: Loads client data, event details, and assignments from Supabase
- **PortalBottomNav**: 4 tabs — Dashboard, Photos, Videos, Payment
- **ClientContactForm**: Separate standalone page at `/client-form/:slug/:id`
- **Contact data**: Stored in `contact_details_cache` table, saved via `google-sheets` edge function

## Plan

### 1. Add "My Details" Tab to Bottom Navigation
**File: `src/components/client-portal/PortalBottomNav.tsx`**
- Add 5th tab: `details` with `UserCircle` icon and label "My Details"
- Update `PortalTab` type to include `'details'`

### 2. Redesign PortalDashboard — Premium Wedding UI
**File: `src/components/client-portal/PortalDashboard.tsx`**
- Pass `assignments` data (all fields including videographer, drone, etc.) as prop
- **Hero section**: Large animated countdown with particle/shimmer effects, gradient background, client name in elegant typography
- **Event cards**: Expandable — collapsed shows event name + date + venue; expanded shows:
  - Venue with map link
  - Timing
  - Freelancer crew list (Photographer Bride, Photographer Groom, Videographer Bride, Videographer Groom, Extra Photographer, Drone, etc.) with role labels and colored badges
- Use glass-morphism cards, subtle animations, rose/gold accent palette
- Add WTN branding watermark

### 3. Load Full Assignment Data in ClientPortal
**File: `src/pages/ClientPortal.tsx`**
- Expand the `freelancer_assignments` query to fetch ALL role columns (videographer_bride, videographer_groom, extra_videographer, assistant, iphone_shooter, drone_operator, fpv_operator)
- Expand `Assignment` interface to include all roles
- Pass full assignments to PortalDashboard
- Load `contact_details_cache` for the client (new query)
- Track `contactLoaded` and `hasFilledContact` state
- Pass contact data + save handler to the new "My Details" tab

### 4. Create PortalMyDetails Component — Integrated Form
**File: `src/components/client-portal/PortalMyDetails.tsx`** (new)
- Dark-themed version of the existing `ClientContactForm` adapted for the portal
- Two sections: Bride (rose accent) and Groom (sky accent)
- **Required fields** (validated before save): Full Name, Contact Number, WhatsApp Number — for both bride and groom
- **Optional fields**: Backup numbers, relations, Instagram, home address
- **Partial save**: Client can save just the required fields and fill the rest later
- Save via `supabase.functions.invoke('google-sheets', { action: 'updateClientContactDetails' })`
- Also upsert into `contact_details_cache` for instant reads
- Show success toast on save, form stays editable (not a one-time submit)
- Pre-fill from cached data on load

### 5. Smart Form Reminder
**File: `src/pages/ClientPortal.tsx`**
- On load, check `contact_details_cache` for this client
- If bride/groom name + contact + whatsapp are not all filled → show a gentle banner at the top of Dashboard tab:
  - "Please fill in your contact details" with a button that switches to "My Details" tab
  - Not a popup/modal — just a persistent banner within the dashboard content
  - Dismisses once they navigate to My Details tab

### 6. Premium Visual Polish
**Files: PortalDashboard, PortalBottomNav, ClientPortal, PortalMyDetails**
- Dark theme with rose-gold gradients throughout
- Animated countdown: large number with glow effect, ring animation
- Glass-morphism event cards with hover/tap micro-interactions
- Smooth tab transitions
- Bottom nav with active indicator glow
- Shimmer loading skeletons instead of plain spinner
- Event expand/collapse with smooth height animation
- WTN branding: subtle rose hearts, elegant typography

## Technical Details

### Data Flow
```text
ClientPortal.tsx
  ├── fetches: clients_cache, event_details_cache, freelancer_assignments, contact_details_cache
  ├── PortalDashboard (events + full assignments + contactFilled flag)
  ├── PortalMyPhotos (assignments)
  ├── PortalMyVideos (client info)
  ├── PortalMyPayment
  └── PortalMyDetails (contactData + saveHandler + registeredDateTimeAD)
```

### Required Fields Validation (PortalMyDetails)
- Bride: fullName, contactNumber, whatsappNumber
- Groom: fullName, contactNumber, whatsappNumber
- Phone validation: 10 digits, numeric only
- Save button disabled until all 6 required fields are filled

### Files Changed
1. `src/components/client-portal/PortalBottomNav.tsx` — add 5th tab
2. `src/components/client-portal/PortalDashboard.tsx` — complete redesign with assignments + premium UI
3. `src/pages/ClientPortal.tsx` — fetch all assignment roles + contact data, wire new tab + reminder
4. `src/components/client-portal/PortalMyDetails.tsx` — new file, dark-themed contact form
5. `src/index.css` — add portal-specific animations (shimmer, glow, expand)

