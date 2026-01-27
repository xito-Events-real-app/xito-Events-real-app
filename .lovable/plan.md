

## Add Event Dropdown from "EVENT SETUP DATA" Sheet

This plan implements a new event dropdown that fetches data from the dedicated "EVENT SETUP DATA" sheet (Column A, starting from row 2), replacing the current approach of combining events from three separate columns.

---

### Current vs New Architecture

```text
CURRENT APPROACH:
+-----------------------------------+
| CLIENT TRACKER SETUP DATA         |
| Col D: preweddingEvents           |
| Col E: weddingEvents              |  --> Combined in frontend
| Col F: postweddingEvents          |
+-----------------------------------+

NEW APPROACH:
+-----------------------------------+
| EVENT SETUP DATA                  |
| Col A: All Event Names (Row 2+)   |  --> Single source of truth
+-----------------------------------+
```

---

### Implementation Steps

#### 1. Edge Function Update
**File:** `supabase/functions/google-sheets/index.ts`

Add a new action `getEventSetupData` to fetch from the "EVENT SETUP DATA" sheet:

```typescript
// New action: getEventSetupData
async function getEventSetupData(accessToken: string, spreadsheetId: string) {
  const range = encodeURIComponent("'EVENT SETUP DATA'!A2:A500");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  const data = await response.json();
  if (!data.values) return [];
  
  // Extract event names from Column A, filter empty values
  return data.values.map((row: string[]) => row[0]).filter(Boolean);
}
```

Add the new action to the switch statement:
```typescript
case 'getEventSetupData':
  result = await getEventSetupData(accessToken, spreadsheetId);
  break;
```

---

#### 2. API Layer Update
**File:** `src/lib/sheets-api.ts`

Add a new function to call the edge function:

```typescript
export async function getEventSetupData(): Promise<string[]> {
  const result = await supabase.functions.invoke("google-sheets", {
    body: { action: "getEventSetupData" },
  });
  
  if (result.error) throw new Error(result.error.message);
  if (!result.data?.success) throw new Error(result.data?.error || "Failed to fetch event setup data");
  
  return result.data.data || [];
}
```

---

#### 3. Update DropdownData Interface
**File:** `src/lib/sheets-api.ts`

Add a new field to the interface:
```typescript
export interface DropdownData {
  // ... existing fields ...
  allEvents: string[];  // NEW: From EVENT SETUP DATA sheet
}
```

---

#### 4. Update useCachedData Hook
**File:** `src/hooks/useCachedData.ts`

Fetch the new event data alongside existing dropdowns and include it in the cache:
- Add `getEventSetupData()` call in the fetch logic
- Include `allEvents` in the dropdowns object

---

#### 5. Update QuickAdd Form (Mobile)
**File:** `src/pages/QuickAdd.tsx`

Replace the `allEventOptions` logic:

**Before:**
```typescript
const allEventOptions = useMemo(() => {
  const events: string[] = [];
  if (dropdowns?.preweddingEvents) events.push(...dropdowns.preweddingEvents);
  if (dropdowns?.weddingEvents) events.push(...dropdowns.weddingEvents);
  if (dropdowns?.postweddingEvents) events.push(...dropdowns.postweddingEvents);
  return [...new Set(events)];
}, [dropdowns]);
```

**After:**
```typescript
const allEventOptions = useMemo(() => {
  // Use allEvents from EVENT SETUP DATA sheet, fallback to combined events for backwards compatibility
  if (dropdowns?.allEvents && dropdowns.allEvents.length > 0) {
    return dropdowns.allEvents;
  }
  // Fallback to old method
  const events: string[] = [];
  if (dropdowns?.preweddingEvents) events.push(...dropdowns.preweddingEvents);
  if (dropdowns?.weddingEvents) events.push(...dropdowns.weddingEvents);
  if (dropdowns?.postweddingEvents) events.push(...dropdowns.postweddingEvents);
  return [...new Set(events)];
}, [dropdowns]);
```

---

#### 6. Update DesktopQuickAdd Form
**File:** `src/components/desktop/DesktopQuickAdd.tsx`

Same update as mobile - replace `availableEvents` logic:

**Before:**
```typescript
const availableEvents = useMemo(() => {
  const all: string[] = [];
  if (dropdowns?.preweddingEvents) all.push(...dropdowns.preweddingEvents);
  if (dropdowns?.weddingEvents) all.push(...dropdowns.weddingEvents);
  if (dropdowns?.postweddingEvents) all.push(...dropdowns.postweddingEvents);
  return [...new Set(all)];
}, [dropdowns]);
```

**After:**
```typescript
const availableEvents = useMemo(() => {
  // Use allEvents from EVENT SETUP DATA sheet, fallback to combined events
  if (dropdowns?.allEvents && dropdowns.allEvents.length > 0) {
    return dropdowns.allEvents;
  }
  const all: string[] = [];
  if (dropdowns?.preweddingEvents) all.push(...dropdowns.preweddingEvents);
  if (dropdowns?.weddingEvents) all.push(...dropdowns.weddingEvents);
  if (dropdowns?.postweddingEvents) all.push(...dropdowns.postweddingEvents);
  return [...new Set(all)];
}, [dropdowns]);
```

---

### Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/google-sheets/index.ts` | Modify | Add `getEventSetupData` action to fetch from "EVENT SETUP DATA" sheet |
| `src/lib/sheets-api.ts` | Modify | Add `getEventSetupData()` API function and update `DropdownData` interface |
| `src/hooks/useCachedData.ts` | Modify | Include `allEvents` in the dropdown data fetching |
| `src/pages/QuickAdd.tsx` | Modify | Update `allEventOptions` to use new data source |
| `src/components/desktop/DesktopQuickAdd.tsx` | Modify | Update `availableEvents` to use new data source |

---

### Data Flow

```text
User opens QuickAdd form
        ↓
useCachedData hook loads dropdowns
        ↓
Edge function calls getEventSetupData()
        ↓
Fetches "EVENT SETUP DATA" sheet → Column A (Row 2+)
        ↓
Returns array of event names
        ↓
Stored in dropdowns.allEvents
        ↓
EventSelector component displays options
```

---

### Backwards Compatibility

The implementation includes a fallback mechanism: if `allEvents` is empty or undefined, it will combine the existing `preweddingEvents`, `weddingEvents`, and `postweddingEvents` from the old columns. This ensures the form continues to work even if the new sheet doesn't exist yet.

