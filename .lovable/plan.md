
# Client Details Enhancement Plan

## Overview

This plan addresses 4 user requirements:
1. **Automatic Syncing** - Sync booked clients to "BOOKED CLIENTS CONTACT DETAILS" sheet when app opens
2. **Manual Resync Button** - Add a resync button on the Client Details form
3. **Form Aesthetics** - Make the form more visually appealing for clients to fill out
4. **WhatsApp Input** - Remove country code restriction, allow any number to be pasted

---

## Part 1: Automatic Syncing on App Open

### Backend: Add `fullSyncContactDetails` Action

**File: `supabase/functions/google-sheets/index.ts`**

Add a new action similar to `fullSyncEventDetails` that:
1. Fetches all clients from "BOOKED CLIENTS" sheet (Columns A-C)
2. Checks which clients are missing in "BOOKED CLIENTS CONTACT DETAILS" sheet
3. Creates rows for missing clients with A-C synced, D-AA empty
4. Updates A-C for existing entries (preserving D-AA user data)

### Frontend: Add Sync Helper Function

**File: `src/lib/sheets-api.ts`**

Add export function:
```typescript
export async function fullSyncContactDetails(): Promise<{ 
  success: boolean; 
  copiedCount: number; 
  updatedCount: number; 
  totalClients: number;
}>
```

### Frontend: Trigger on App Load

**Option A - Integration with Master Sync**

**File: `src/components/suite/MasterSyncButton.tsx`**

Add Phase 5 after Vendor Sync:
- Label: "Contact Details"
- Description: "Syncing client contact data..."
- Call `fullSyncContactDetails()` API

**Option B - Automatic on Client Detail Load**

**File: `src/pages/ClientDetail.tsx`**

On component mount, check if client exists in Contact Details sheet (already done via `getClientContactDetails` which auto-creates missing entries).

**Recommended**: Combine both - auto-create on individual page load (already working) AND bulk sync during Master Sync.

---

## Part 2: Manual Resync Button on Client Details Form

### UI Changes

**File: `src/components/client-detail/ClientDetailsCard.tsx`**

Add a "Resync" button next to Save/Cancel:
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={handleResync}
  disabled={isResyncing}
  className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
>
  {isResyncing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
  Resync
</Button>
```

The resync will:
1. Re-fetch the latest A-C data from BOOKED CLIENTS
2. Update the CONTACT DETAILS sheet with refreshed client name/dates
3. Refresh the form display

### Props Update

**File: `src/components/client-detail/ClientDetailsCard.tsx`**

Add `onResync` prop:
```typescript
interface ClientDetailsCardProps {
  data: ClientContactDetails | null;
  isLoading: boolean;
  onSave: (updates: Partial<ClientContactDetails>) => Promise<boolean>;
  onResync: () => Promise<void>; // NEW
}
```

### Hook Update

**File: `src/hooks/useClientContactDetails.ts`**

Add `resyncClient` function that calls a new backend action to force-refresh A-C columns from BOOKED CLIENTS.

---

## Part 3: Enhanced Form Aesthetics (Client-Facing)

### Design Goals
- More welcoming and elegant appearance
- Clear visual hierarchy
- Decorative elements (icons, gradients, subtle animations)
- Better spacing and typography
- Clear section headers with icons
- Progress indicators for completion

### UI Enhancements

**File: `src/components/client-detail/ClientDetailsCard.tsx`**

1. **Hero Header with Welcome Message**
   ```tsx
   <div className="text-center mb-6">
     <h2 className="text-2xl font-bold text-white">Welcome! ✨</h2>
     <p className="text-white/70">Please fill in your contact details</p>
   </div>
   ```

2. **Section Cards with Icons and Gradients**
   - Bride Section: Soft pink gradient with heart/crown icon
   - Groom Section: Soft blue gradient with ring icon

3. **Field Groupings with Decorative Headers**
   ```tsx
   <div className="relative mb-4">
     <div className="flex items-center gap-3">
       <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center">
         <Phone className="h-5 w-5 text-white" />
       </div>
       <div>
         <h4 className="font-semibold text-white">Contact Information</h4>
         <p className="text-xs text-white/50">Primary and backup numbers</p>
       </div>
     </div>
   </div>
   ```

4. **Input Styling Improvements**
   - Larger input fields (h-12 instead of h-10)
   - Rounded corners (rounded-xl)
   - Subtle focus animations
   - Helper text under each field

5. **Completion Progress Indicator**
   ```tsx
   <div className="flex items-center gap-2 mb-4">
     <Progress value={completionPercentage} className="h-2" />
     <span className="text-sm text-white/60">{completionPercentage}% Complete</span>
   </div>
   ```

6. **Decorative Elements**
   - Subtle sparkle/heart decorations
   - Gradient backgrounds
   - Soft shadows and borders

---

## Part 4: WhatsApp Number - Remove Country Code Restriction

### Current Issue
Using `PhoneInputField` which enforces Nepal country code format.

### Solution

**File: `src/components/client-detail/ClientDetailsCard.tsx`**

Replace `PhoneInputField` for WhatsApp fields with a simple `Input`:

```tsx
<Input
  value={brideWhatsappNumber}
  onChange={(e) => setBrideWhatsappNumber(e.target.value)}
  placeholder="Enter WhatsApp number (paste any format)"
  type="tel"
  className="bg-white/5 border-white/20 text-white"
/>
```

This allows clients to paste:
- `+977 9801234567`
- `9801234567`
- `+1 555-123-4567`
- Any international format

The `formatWhatsAppLink` helper in `client-contact-api.ts` already handles stripping non-digits.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/google-sheets/index.ts` | Modify | Add `fullSyncContactDetails` and `resyncClientContactDetails` actions |
| `src/lib/sheets-api.ts` | Modify | Add `fullSyncContactDetails()` export function |
| `src/components/suite/MasterSyncButton.tsx` | Modify | Add Phase 5 for Contact Details sync |
| `src/hooks/useClientContactDetails.ts` | Modify | Add `resyncClient` function |
| `src/components/client-detail/ClientDetailsCard.tsx` | Modify | Add resync button, enhance form UI, change WhatsApp inputs |

---

## Technical Details

### New Backend Action: `fullSyncContactDetails`

```typescript
async function fullSyncContactDetails(accessToken: string, spreadsheetId: string) {
  // 1. Fetch all BOOKED CLIENTS data (A-C)
  const bookedRange = "'BOOKED CLIENTS'!A2:C2000";
  
  // 2. Fetch existing CONTACT DETAILS entries
  const contactRange = "'BOOKED CLIENTS CONTACT DETAILS'!A2:C2000";
  
  // 3. Build map of existing entries by registeredDateTimeAD
  
  // 4. For each booked client:
  //    - If exists: Update A-C only (preserve D-AA)
  //    - If missing: Create new row with A-C, empty D-AA
  
  return { copiedCount, updatedCount, totalClients };
}
```

### New Backend Action: `resyncClientContactDetails`

```typescript
async function resyncClientContactDetails(
  accessToken: string, 
  spreadsheetId: string, 
  registeredDateTimeAD: string
) {
  // 1. Get latest data from BOOKED CLIENTS for this client
  // 2. Update A-C in CONTACT DETAILS sheet
  // 3. Return refreshed data
}
```

### WhatsApp Input Changes

For WhatsApp fields, use plain `<Input type="tel">` instead of `PhoneInputField`:
- No country code dropdown
- No formatting restrictions
- Client can paste any phone number format
- Backend handles cleanup when generating WhatsApp links

---

## UI Mockup - Enhanced Form

```
╔══════════════════════════════════════════════════════════════╗
║  ✨ CLIENT DETAILS FORM ✨                    [Resync] [Save] ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ Progress: ████████░░░░░░░░ 45% Complete                 │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  ┌─────────────────── 👰 BRIDE'S DETAILS ──────────────────┐  ║
║  │ 🌸 Pink gradient background                              │  ║
║  │                                                          │  ║
║  │  ┌── 📞 Contact Information ──┐                          │  ║
║  │  │ Full Name: [____________]  │                          │  ║
║  │  │ Contact:   [+977 ________] │                          │  ║
║  │  │ WhatsApp:  [____________]  │ (any format)             │  ║
║  │  └────────────────────────────┘                          │  ║
║  │                                                          │  ║
║  │  ┌── 👥 Backup Contacts ──────┐                          │  ║
║  │  │ Backup 1: [___] Relation: [Mother ▼]                  │  ║
║  │  │ Backup 2: [___] Relation: [Father ▼]                  │  ║
║  │  └────────────────────────────┘                          │  ║
║  │                                                          │  ║
║  │  ┌── 📍 Address ──────────────┐                          │  ║
║  │  │ City: [Kathmandu ▼] Area: [___]                       │  ║
║  │  │ Map Link: [___________] [🔗]                          │  ║
║  │  │ Landmark: [___________]                               │  ║
║  │  └────────────────────────────┘                          │  ║
║  └──────────────────────────────────────────────────────────┘  ║
║                                                               ║
║  ┌─────────────────── 🤵 GROOM'S DETAILS ──────────────────┐  ║
║  │ 💙 Blue gradient background                              │  ║
║  │ ... (Same structure as Bride)                            │  ║
║  └──────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════╝
```

---

## Implementation Order

1. **Backend first**: Add `fullSyncContactDetails` and `resyncClientContactDetails` actions
2. **Sheets API**: Add frontend wrapper function
3. **Master Sync**: Add Phase 5 for bulk contact sync
4. **Hook Update**: Add resync capability to `useClientContactDetails`
5. **Form Enhancement**: Update ClientDetailsCard with:
   - Resync button
   - Plain Input for WhatsApp fields
   - Enhanced visual styling
6. **Deploy and test**
