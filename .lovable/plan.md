

# Delete Client Feature with Full Danger Warning, Heartbeat Sound & Password Gate

## Overview

Add a "Delete Client" button to the Client Detail hero section. Clicking it opens a password gate (984124), followed by a dramatic red danger confirmation dialog with a synthetic heartbeat sound. Deletion removes the client from:

1. Google Sheets: CLIENT TRACKER or BOOKED CLIENTS (main sheet)
2. Google Sheets: BOOKED CLIENTS EVENT DETAILS
3. Google Sheets: BOOKED CLIENTS FREELANCERS
4. Google Sheets: BOOKED CLIENTS CONTACT DETAILS
5. Supabase: `clients_cache`, `event_details_cache`, `contact_details_cache`, `freelancer_assignments`, `freelancer_event_settings`

## User Flow

```text
Client Detail Page
  -> Click red "Delete Client" button (Trash icon in hero actions)
  -> Password dialog appears (enter 984124)
  -> If correct: Danger confirmation dialog opens
     - Full red pulsing UI with animated danger icons
     - Heartbeat sound starts immediately (Web Audio API - synthetic)
     - "Go Back to Safety" button -> stops sound, closes dialog
     - "Permanently Delete" button -> stops sound, deletes client, navigates to dashboard
  -> If incorrect password: error shake + toast
```

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/components/client-detail/DeleteClientDialog.tsx` | **New** - Two-stage dialog: password gate + danger confirmation with heartbeat |
| `src/components/client-detail/index.ts` | Export new component |
| `src/components/client-detail/ClientHeroSection.tsx` | Add red Delete button + props |
| `src/pages/ClientDetail.tsx` | Add delete state/handler, pass props to hero |
| `src/lib/sheets-api.ts` | Add `deleteClient()` API function |
| `supabase/functions/google-sheets/index.ts` | Add `deleteClient` action - deletes from all 4 sheets + all 5 Supabase tables |

## Technical Details

### 1. DeleteClientDialog Component

**Stage 1 - Password Gate:**
- Dark dialog with password input (type="password")
- Validates against hardcoded "984124"
- Wrong password shows error shake animation + toast

**Stage 2 - Danger Confirmation:**
- Red gradient background with pulsing red border (CSS animation)
- Large AlertTriangle icon with scale-in animation
- Client name displayed prominently in white
- Warning text: "This action is irreversible. This client will be permanently deleted from ALL systems including event details, contact details, and crew assignments."
- Heartbeat sound via Web Audio API (two quick low-frequency oscillator pulses in a loop, no audio file needed)
- Sound starts on mount of stage 2, stops on unmount or any action
- Two buttons: "Go Back to Safety" (neutral) and "Permanently Delete" (deep red)

### 2. Edge Function - `deleteClient` action

The backend handler will:

1. Determine the main sheet (`CLIENT TRACKER` or `BOOKED CLIENTS`) based on `sheetSource` parameter
2. Find and delete the row from the main sheet using `registeredDateTimeAD` to verify the correct row
3. Find and delete the matching row(s) from `BOOKED CLIENTS EVENT DETAILS` (Column A = registeredDateTimeAD)
4. Find and delete the matching row(s) from `BOOKED CLIENTS FREELANCERS` (Column A = registeredDateTimeAD)
5. Find and delete the matching row(s) from `BOOKED CLIENTS CONTACT DETAILS` (Column A = registeredDateTimeAD)
6. Delete from Supabase tables:
   - `clients_cache` WHERE `registered_date_time_ad` = ID
   - `event_details_cache` WHERE `registered_date_time_ad` = ID
   - `contact_details_cache` WHERE `registered_date_time_ad` = ID
   - `freelancer_assignments` WHERE `registered_date_time_ad` = ID
   - `freelancer_event_settings` WHERE `registered_date_time_ad` = ID

All sheet deletions use the `deleteDimension` batch update API (same pattern as `deleteVendor`). Rows are deleted in reverse order to avoid index shifting.

### 3. Frontend Delete Handler (ClientDetail.tsx)

Follows Supabase-first pattern:
1. Delete from all Supabase cache tables instantly
2. Remove from memory cache
3. Show success toast
4. Navigate to dashboard
5. Fire Sheets delete in background (non-blocking)

### 4. Heartbeat Sound (Web Audio API)

No audio file needed. Synthesized directly:
```typescript
// Creates two quick "thump" sounds using OscillatorNode
// Frequency ~60Hz, short duration, repeated every 800ms
// Starts on dialog open, AudioContext.close() on dialog close
```

### 5. ClientHeroSection Changes

Add two new props:
- `onDelete?: () => void`
- `isDeleting?: boolean`

Add a red Trash2 button in the actions row (next to Edit/Sync/Benzo Keep).

## Safety Measures

- Password gate (984124) prevents accidental access
- Dramatic UI and heartbeat sound create awareness
- Clear "Go Back to Safety" escape option
- All related data cleaned from both Sheets and Supabase (no orphaned records)
- Supabase deletion is instant; Sheets deletion runs in background

