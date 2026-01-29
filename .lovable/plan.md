

# Client Details Section - Full Implementation Plan

## Overview

This plan implements a new "Client Details" section in the Client Detail page that displays comprehensive bride and groom contact/location information in an expandable card format (matching the Event Details pattern).

---

## Part 1: Sidebar Navigation Updates

### File: `src/components/client-detail/ClientDetailSidebar.tsx`

**Changes:**
1. Add `Users` icon import from lucide-react
2. Rename section ID from `'contact'` to `'clientDetails'`
3. Update label from "Contact" to "Client Details"
4. Reorder `sidebarItems` array to place Client Details directly after Event Details:

```
dashboard -> events -> clientDetails -> registration -> inquiry -> sales -> activity -> comments -> financials
```

---

## Part 2: Data Types and API Layer

### New File: `src/lib/client-contact-api.ts`

Create TypeScript interfaces and API functions:

```typescript
export interface ClientContactDetails {
  rowNumber: number;
  registeredDateTimeAD: string;
  registeredDateBS: string;
  clientName: string;
  
  // Bride Details (Columns D-O)
  brideFullName: string;
  brideContactNumber: string;
  brideWhatsappNumber: string;
  brideBackupNumber: string;
  brideBackupRelation: string;        // Mother / Father / Sister / Other
  brideBackupNumber2: string;
  brideBackupRelation2: string;
  brideInstagram: string;             // Without @
  brideHomeCity: string;
  brideHomeArea: string;
  brideHomeMap: string;               // Google Maps link
  brideHomeLandmark: string;
  
  // Groom Details (Columns P-AA)
  groomFullName: string;
  groomContactNumber: string;
  groomWhatsappNumber: string;
  groomBackupNumber: string;
  groomBackupRelation: string;        // Father / Brother / Other
  groomBackupNumber2: string;
  groomBackupRelation2: string;
  groomInstagram: string;             // Without @
  groomHomeCity: string;
  groomHomeArea: string;
  groomHomeMap: string;               // Google Maps link
  groomHomeLandmark: string;
}
```

---

## Part 3: React Hook for Data Fetching

### New File: `src/hooks/useClientContactDetails.ts`

Similar pattern to `useEventDetails.ts`:
- `fetchContactDetails()` - fetches data from the sheet
- `updateContactDetails()` - updates data in the sheet
- Auto-creates row if client doesn't exist (syncing Columns A-C from BOOKED CLIENTS)

---

## Part 4: Backend Edge Function

### File: `supabase/functions/google-sheets/index.ts`

Add 2 new actions to the edge function:

**1. `getClientContactDetails`**
- Input: `registeredDateTimeAD`
- Finds client in "BOOKED CLIENTS CONTACT DETAILS" sheet by Column A
- If not found, auto-creates row with synced A-C data from BOOKED CLIENTS
- Returns all contact fields (Columns D-AA)
- Column mapping: A(0) through AA(26)

**2. `updateClientContactDetails`**
- Input: `registeredDateTimeAD`, `updates` (partial contact details)
- Updates specified columns for the matching client
- Uses row verification pattern (like event details)

---

## Part 5: UI Component - ClientDetailsCard

### New File: `src/components/client-detail/ClientDetailsCard.tsx`

Following the `FullScreenEventCard.tsx` pattern with expandable read/edit modes.

### Form Structure (Edit Mode)

**BRIDE'S DETAILS Section (Pink/Rose theme: `bg-pink-500/10`, `text-pink-400`)**

| Field | Type | Placeholder/Options | Notes |
|-------|------|---------------------|-------|
| Full Name | Text Input | "Enter bride's full name (as per official records)" | Required |
| Contact Number | PhoneInputField (NP) | "Enter bride's 10-digit Nepali mobile number" | Required |
| WhatsApp Number | PhoneInputField (NP) | "Enter bride's WhatsApp number" | Checkbox: "Same as Contact Number" |
| Backup Number | PhoneInputField (NP) | "Enter alternate Nepali mobile number" | |
| Backup Relation | Select | Mother / Father / Sister / Other | |
| Backup Number 2 | PhoneInputField (NP) | "Enter second alternate mobile (optional)" | Optional |
| Backup Relation 2 | Select | Mother / Father / Sister / Other | |
| Instagram Handle | Text Input | "Enter Instagram username (without @)" | Prefix shown as "@" |
| Home City | Combobox | Nepal cities from `nepal-cities.ts` | |
| Home Area | Text Input | "Enter locality / area name" | |
| Google Map Location | Text Input | "Paste Google Maps location link" | Button: "Open Google Maps" |
| Home Landmark | Text Input | "Enter nearby landmark" | |

**GROOM'S DETAILS Section (Blue/Indigo theme: `bg-blue-500/10`, `text-blue-400`)**

| Field | Type | Placeholder/Options | Notes |
|-------|------|---------------------|-------|
| Full Name | Text Input | "Enter groom's full name (as per official records)" | Required |
| Contact Number | PhoneInputField (NP) | "Enter groom's 10-digit Nepali mobile number" | Required |
| WhatsApp Number | PhoneInputField (NP) | "Enter groom's WhatsApp number" | Checkbox: "Same as Contact Number" |
| Backup Number | PhoneInputField (NP) | "Enter alternate Nepali mobile number" | |
| Backup Relation | Select | Father / Brother / Other | |
| Backup Number 2 | PhoneInputField (NP) | "Enter second alternate mobile (optional)" | Optional |
| Backup Relation 2 | Select | Father / Brother / Other | |
| Instagram Handle | Text Input | "Enter Instagram username (without @)" | Prefix shown as "@" |
| Home City | Combobox | Nepal cities from `nepal-cities.ts` | |
| Home Area | Text Input | "Enter locality / area name" | |
| Google Map Location | Text Input | "Paste Google Maps location link" | Button: "Open Google Maps" |
| Home Landmark | Text Input | "Enter nearby landmark" | |

### Read-Only View (Collapsed State)

```
+------------------------------------------------------------+
| [Users Icon] CLIENT DETAILS       [Filled/Empty Badge]     |
|                                            [Expand Button] |
+------------------------------------------------------------+
| LEFT: BRIDE                    | RIGHT: GROOM              |
| Name: [name]                   | Name: [name]              |
| Contact: [clickable tel]       | Contact: [clickable tel]  |
| WhatsApp: [clickable wa]       | WhatsApp: [clickable wa]  |
| Instagram: [@handle link]      | Instagram: [@handle link] |
| Home: [city, area] [map icon]  | Home: [city, area] [map]  |
+------------------------------------------------------------+
```

### Special Features

1. **"Same as Contact" Toggle**: For WhatsApp numbers, show a Switch component that auto-copies the contact number
2. **External Links**: 
   - Phone numbers: `tel:` links
   - WhatsApp: `https://wa.me/` links
   - Instagram: `https://instagram.com/[handle]` links
   - Maps: External link icon that opens in new tab
3. **Empty State**: "No contact details recorded. Click to add bride and groom information."
4. **Validation**: Phone fields use Nepal (NP) as default country

---

## Part 6: ClientDetail Page Integration

### File: `src/pages/ClientDetail.tsx`

**Changes:**
1. Update `SectionType` import to include `'clientDetails'`
2. Import and use `useClientContactDetails` hook
3. Import `ClientDetailsCard` component
4. Update mobile tabs array with new section order
5. Replace old "Contact" section render with new `ClientDetailsCard`

---

## Part 7: Export Updates

### File: `src/components/client-detail/index.ts`

Add export for the new `ClientDetailsCard` component.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/components/client-detail/ClientDetailSidebar.tsx` | Modify | Rename section, update icon, reorder tabs |
| `src/lib/client-contact-api.ts` | Create | TypeScript interfaces |
| `src/hooks/useClientContactDetails.ts` | Create | Data fetching/updating hook |
| `supabase/functions/google-sheets/index.ts` | Modify | Add 2 new actions |
| `src/components/client-detail/ClientDetailsCard.tsx` | Create | Expandable UI component with form |
| `src/pages/ClientDetail.tsx` | Modify | Integrate new section |
| `src/components/client-detail/index.ts` | Modify | Export new component |

---

## Sheet Column Mapping

| Column | Index | Field |
|--------|-------|-------|
| A | 0 | registeredDateTimeAD (synced) |
| B | 1 | registeredDateBS (synced) |
| C | 2 | clientName (synced) |
| D | 3 | brideFullName |
| E | 4 | brideContactNumber |
| F | 5 | brideWhatsappNumber |
| G | 6 | brideBackupNumber |
| H | 7 | brideBackupRelation |
| I | 8 | brideBackupNumber2 |
| J | 9 | brideBackupRelation2 |
| K | 10 | brideInstagram |
| L | 11 | brideHomeCity |
| M | 12 | brideHomeArea |
| N | 13 | brideHomeMap |
| O | 14 | brideHomeLandmark |
| P | 15 | groomFullName |
| Q | 16 | groomContactNumber |
| R | 17 | groomWhatsappNumber |
| S | 18 | groomBackupNumber |
| T | 19 | groomBackupRelation |
| U | 20 | groomBackupNumber2 |
| V | 21 | groomBackupRelation2 |
| W | 22 | groomInstagram |
| X | 23 | groomHomeCity |
| Y | 24 | groomHomeArea |
| Z | 25 | groomHomeMap |
| AA | 26 | groomHomeLandmark |

---

## UI/UX Design Notes

1. **Color Scheme**:
   - Bride section: Pink/Rose accent (`bg-pink-500/10`, `text-pink-400`, `border-pink-500/30`)
   - Groom section: Blue/Indigo accent (`bg-blue-500/10`, `text-blue-400`, `border-blue-500/30`)

2. **Dark Theme Styling**: Following the `FullScreenEventCard` pattern with `bg-slate-800` containers

3. **Responsive Layout**: Two-column layout on desktop, stacked on mobile

4. **Form Field Groupings**:
   - Personal Info (Name, Primary Contact, WhatsApp)
   - Backup Contacts (2 backup numbers with relations)
   - Social (Instagram)
   - Address (City, Area, Map, Landmark)

5. **Quick Actions**: All phone/WhatsApp numbers are clickable to open respective apps

