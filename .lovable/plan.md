

# Plan: Dynamic Relation Dropdown & Free-Form WhatsApp Numbers for Client Form

## Overview

This plan ensures that:
1. **WhatsApp number fields** allow completely free-form entry (any format, any country code)
2. **Relation dropdowns** are dynamically fetched from "CLIENT TRACKER SETUP DATA" Column R every time the form opens
3. The form synchronizes dropdown data fresh on each load

---

## Current State Analysis

### WhatsApp Number Fields
**Status: Already Implemented Correctly**

The WhatsApp fields in `ClientContactForm.tsx` (lines 468-474) already use standard `<Input type="tel">` components, which allow any text entry. No changes needed here.

### Relation Dropdowns
**Status: Uses Hardcoded Values - Needs Fix**

```typescript
// Line 14 - Currently hardcoded
const relationOptions = ["Mother", "Father", "Sister", "Brother", "Spouse", "Friend", "Other"];
```

The backend already supports `relationOptions` in `getDropdowns()` (Column R), but the public form doesn't fetch it.

---

## Technical Changes

### 1. Add New Backend Action: `getPublicFormData`
**File**: `supabase/functions/google-sheets/index.ts`

Create a lightweight action that fetches ONLY the relation options for the public form (no authentication required):

```text
New Function: getPublicFormData(accessToken, spreadsheetId)
  - Fetches Column R from "CLIENT TRACKER SETUP DATA" 
  - Returns: { relationOptions: string[] }
  - This is separate from getDropdowns which returns all data
```

Add to the switch statement:
```typescript
case 'getPublicFormData':
  result = await getPublicFormData(accessToken, spreadsheetId);
  break;
```

### 2. Update ClientContactForm.tsx
**File**: `src/pages/ClientContactForm.tsx`

Changes:
1. Remove hardcoded `relationOptions` constant
2. Add state for `relationOptions`
3. Fetch relation options on component mount (parallel with existing data fetch)
4. Pass `relationOptions` as prop to `PersonForm`
5. Update `PersonForm` to receive and use dynamic options

**Flow:**
```text
Client Opens Form
       │
       ▼
┌──────────────────────┐    ┌──────────────────────┐
│ Fetch Contact Data   │    │ Fetch Relation Opts  │
│ (existing)           │    │ (new)                │
└──────────┬───────────┘    └──────────┬───────────┘
           │                           │
           └───────────┬───────────────┘
                       │
                       ▼
              Form Renders with
              Dynamic Dropdowns
```

### 3. Update PersonForm Component
**File**: `src/pages/ClientContactForm.tsx`

Update the `PersonFormProps` interface and component:

```typescript
interface PersonFormProps {
  person: PersonDetails;
  onChange: (field: keyof PersonDetails, value: string) => void;
  accentColor: "rose" | "sky";
  relationOptions: string[];  // NEW: Dynamic options from sheet
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/google-sheets/index.ts` | Add `getPublicFormData` action to fetch Column R relation options |
| `src/pages/ClientContactForm.tsx` | Remove hardcoded options, add state, fetch on mount, pass to PersonForm |

---

## Detailed Code Changes

### Edge Function: New `getPublicFormData` Action

```typescript
// Lightweight function for public form - only fetches relation options
async function getPublicFormData(accessToken: string, spreadsheetId: string) {
  const range = encodeURIComponent("'CLIENT TRACKER SETUP DATA'!R2:R100");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return { relationOptions: ['Mother', 'Father', 'Sister', 'Brother', 'Other'] };
  }

  const data = await response.json();
  const relationOptions = data.values 
    ? data.values.map((row: string[]) => row[0]).filter(Boolean)
    : ['Mother', 'Father', 'Sister', 'Brother', 'Other'];

  return { relationOptions };
}
```

### ClientContactForm: Fetch on Mount

```typescript
// Add state for relation options
const [relationOptions, setRelationOptions] = useState<string[]>([
  'Mother', 'Father', 'Sister', 'Brother', 'Other' // Default fallback
]);

// Fetch relation options when form loads
useEffect(() => {
  const fetchRelationOptions = async () => {
    try {
      const { data: result } = await supabase.functions.invoke('google-sheets', {
        body: { action: 'getPublicFormData' }
      });
      if (result?.success && result.data?.relationOptions?.length > 0) {
        setRelationOptions(result.data.relationOptions);
      }
    } catch (err) {
      console.error('Error fetching relation options:', err);
      // Keep default fallback
    }
  };
  fetchRelationOptions();
}, []);
```

---

## Global WhatsApp Number Flexibility

Per the memory note "features/whatsapp-number-input-flexibility", the WhatsApp fields already use standard `Input` components for maximum flexibility. This allows clients to paste numbers in any international format without country code restrictions.

**Current implementation (no changes needed):**
```tsx
<Input
  type="tel"
  placeholder="98XXXXXXXX"
  value={person.whatsappNumber}
  onChange={(e) => onChange("whatsappNumber", e.target.value)}
  className={`h-12 bg-white border-gray-200 ${borderColor} ${ringColor}`}
/>
```

---

## Expected Behavior After Implementation

1. **WhatsApp fields**: Accept any format (already works)
   - `+977-9841234567`
   - `+1 (555) 123-4567`  
   - `9841234567`
   - Any text the client wants to enter

2. **Relation dropdowns**: 
   - Dynamically load from Column R of CLIENT TRACKER SETUP DATA
   - Fresh fetch every time the form opens
   - Fallback to default options if fetch fails

3. **Synchronization**:
   - Every time a client opens the form, it fetches the latest relation options
   - No caching - always fresh data from the sheet

---

## Memory Updates

After implementation, update memory notes:
- `features/relation-dropdown-source` - Confirm Column R is now used in public form
- `features/whatsapp-number-input-flexibility` - Confirm global consistency

