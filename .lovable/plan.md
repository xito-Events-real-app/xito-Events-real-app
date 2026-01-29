
# Fetch Relation Dropdown from Google Sheet

## Overview

Currently, the relation dropdown options for bride and groom backup contacts are hardcoded in the code. The user wants these options to be fetched dynamically from the **"CLIENT TRACKER SETUP DATA"** sheet, **Column R** (starting from row 2).

## Current State

| Location | Current Implementation |
|----------|----------------------|
| `src/lib/client-contact-api.ts` | `brideBackupRelationOptions = ['Mother', 'Father', 'Sister', 'Other']` |
| `src/lib/client-contact-api.ts` | `groomBackupRelationOptions = ['Father', 'Brother', 'Other']` |
| `src/components/client-detail/ClientDetailsCard.tsx` | Uses hardcoded arrays for relation dropdowns |

## Solution

### Data Flow

```text
CLIENT TRACKER SETUP DATA (Column R)
         |
         v
Edge Function getDropdowns()
         |
         v
DropdownData.relationOptions
         |
         v
ClientDetailsCard.tsx
         |
         v
Bride/Groom Relation Dropdowns
```

## Implementation Steps

### 1. Update Edge Function - Add Column R to getDropdowns

**File: `supabase/functions/google-sheets/index.ts`**

The `getDropdowns` function already fetches columns A-X from "CLIENT TRACKER SETUP DATA". Column R is index 17.

```typescript
// In getDropdowns function, add:
return {
  // ... existing fields
  relationOptions: getColumn(17),  // Column R - Relation options for backup contacts
};
```

### 2. Update DropdownData Interface

**File: `src/lib/sheets-api.ts`**

Add the new field to the DropdownData interface:

```typescript
export interface DropdownData {
  // ... existing fields
  relationOptions: string[];  // Column R - Relation options for backup contacts
}
```

### 3. Update useDropdownData Hook

**File: `src/hooks/useDropdownData.ts`**

Add fallback for relationOptions when using mock data:

```typescript
relationOptions: ['Mother', 'Father', 'Sister', 'Brother', 'Other'],
```

### 4. Update ClientDetailsCard Component

**File: `src/components/client-detail/ClientDetailsCard.tsx`**

Replace hardcoded arrays with dropdown data:

```typescript
// Before:
import { brideBackupRelationOptions, groomBackupRelationOptions } from '@/lib/client-contact-api';

// After:
import { useDropdownData } from '@/hooks/useDropdownData';

// In component:
const { data: dropdownData } = useDropdownData();
const relationOptions = dropdownData?.relationOptions || ['Mother', 'Father', 'Sister', 'Brother', 'Other'];

// Use relationOptions for BOTH bride and groom dropdowns
{relationOptions.map((rel) => (
  <SelectItem key={rel} value={rel}>{rel}</SelectItem>
))}
```

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/google-sheets/index.ts` | Add `relationOptions: getColumn(17)` to getDropdowns return |
| `src/lib/sheets-api.ts` | Add `relationOptions: string[]` to DropdownData interface |
| `src/hooks/useDropdownData.ts` | Add relationOptions fallback in mock data |
| `src/components/client-detail/ClientDetailsCard.tsx` | Use dropdown data instead of hardcoded options |

## Technical Notes

1. **Single Source of Truth**: Both bride and groom relation dropdowns will use the same Column R options, providing consistency and easy management from the sheet.

2. **Backward Compatibility**: The hardcoded options will remain as fallback if the sheet data isn't available.

3. **Cache Integration**: Since dropdowns are already cached via IndexedDB, the relation options will also be cached and available offline.

4. **Column Mapping**: Column R is index 17 (0-indexed: A=0, B=1, ... R=17).
