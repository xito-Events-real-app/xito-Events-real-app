

# Rename "My Info" to "My Profile" + Full Contact Form with Bride/Groom Buttons

## Overview
Replace the current simplified details form with a two-button landing page. Each button opens the full contact form (same fields as ClientContactForm) for either Bride or Groom. Save button is sticky at the top. The existing `contact_details_cache` table already has all the needed columns — no database changes required.

## Changes

### 1. `src/components/client-portal/PortalBottomNav.tsx`
- Change label from `"My Info"` to `"My Profile"`

### 2. `src/components/client-portal/PortalMyDetails.tsx` — Full rewrite
- **Landing view**: Two styled buttons — "Bride Details" (pink) and "Groom Details" (sky blue) with completion indicators
- **Form view**: When a button is tapped, show the full person form (matching `ClientContactForm`'s `PersonForm` fields):
  - Full Name, Contact Number, WhatsApp Number
  - Backup Number 1 + Relation (dropdown)
  - Backup Number 2 + Relation (dropdown)
  - Instagram
  - Home City, Home Area, Google Maps Link, Landmark
- **Sticky top bar**: Fixed header with back arrow, person label ("Bride Details" / "Groom Details"), and Save button — does not scroll with content
- **Data**: Load from and save to `contact_details_cache` (all columns already exist: `bride_backup_number2`, `bride_backup_relation2`, `bride_home_map`, `bride_home_landmark`, and groom equivalents)
- **Relation options**: Fetch from `google-sheets` edge function (`getPublicFormData`) same as `ClientContactForm`, with fallback defaults

### 3. `src/pages/ClientPortal.tsx`
- No tab type changes needed (already uses `'details'`)
- Pass the same props

### 4. `src/pages/ClientContactForm.tsx` — Make read-only
- Add a banner: "Your details are now managed through your Client Portal"
- Disable all form inputs (read-only display of current data)
- Remove submit button, show info text instead

## Technical Notes
- The `contact_details_cache` table already has all 28+ columns (backup2, map, landmark for both)
- The current `PortalMyDetails` only saves 16 fields — the new version will save all fields
- No database migration needed
- Form validation: 10-digit phone check (same as existing)

### Files changed
- `src/components/client-portal/PortalBottomNav.tsx` — label rename
- `src/components/client-portal/PortalMyDetails.tsx` — full rewrite with two-button UX + full form
- `src/pages/ClientContactForm.tsx` — make read-only with portal redirect banner

