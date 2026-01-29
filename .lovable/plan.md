
## Dynamic Dropdowns & Auto-Fill for Parlour Section

You want the same dynamic dropdown and auto-fill functionality for Parlour that was implemented for Venue. The Parlour types will come from Column C of "EVENT DETAILS SETUP DATA" sheet, and each parlour type (e.g., "MAKEUP STUDIO") will have its own sheet with parlour entries.

---

### Data Flow Architecture

```text
+---------------------------+      +----------------------------------+
| EVENT DETAILS SETUP DATA  |      | MAKEUP STUDIO / BEAUTY PARLOUR   |
| Column C: Parlour Types   |      | (Dynamic sheets per type)        |
| - MAKEUP STUDIO           |  =>  | A: NAME                          |
| - BEAUTY PARLOUR          |      | B: COMPANY WHATSAPP              |
| - etc.                    |      | ...                              |
+---------------------------+      | J: CITY, K: AREA, L: MAP         |
            |                      +----------------------------------+
            v                                    |
   +------------------+              +------------------------+
   | Parlour Type     |   triggers   | Parlour Name Dropdown  |
   | Dropdown         |  =========>  | (filtered by type)     |
   +------------------+              +------------------------+
                                              |
                                              v
                                     +-----------------+
                                     | Auto-fill       |
                                     | City, Area, Map |
                                     +-----------------+
```

---

### Changes Required

#### 1. Backend: New Edge Function Actions

**File: `supabase/functions/google-sheets/index.ts`**

Add 3 new actions to the existing function:

| Action | Purpose |
|--------|---------|
| `getParlourTypes` | Fetch parlour types from "EVENT DETAILS SETUP DATA" Column C (row 2+) |
| `getParloursByType` | Fetch all parlours from dynamic sheet (e.g., "MAKEUP STUDIO") |
| `addParlourEntry` | Add new parlour with NAME, CITY, AREA, MAP to the appropriate sheet |

The parlour sheets follow the same schema as venue sheets (A-S columns).

---

#### 2. Frontend: New API Helper

**New File: `src/lib/parlour-api.ts`**

```typescript
export interface ParlourEntry {
  rowNumber: number;
  name: string;
  companyWhatsapp: string;
  companyContact: string;
  owner1: string;
  owner1Contact: string;
  owner1Whatsapp: string;
  owner2: string;
  owner2Contact: string;
  owner2Whatsapp: string;
  city: string;
  area: string;
  googleMap: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  youtube: string;
  website: string;
  gmail: string;
  rating: string;
}

export async function getParlourTypes(): Promise<string[]>;
export async function getParloursByType(parlourType: string): Promise<ParlourEntry[]>;
export async function addParlourEntry(parlourType: string, data: Partial<ParlourEntry>): Promise<void>;
```

---

#### 3. Frontend: New Custom Hook

**New File: `src/hooks/useParlourData.ts`**

This hook mirrors useVenueData but for parlour data:
- Fetch and cache parlour types on mount
- Fetch parlours when type changes
- Handle auto-fill when parlour is selected
- Handle adding new parlours

```typescript
export function useParlourData() {
  const [parlourTypes, setParlourTypes] = useState<string[]>([]);
  const [parlours, setParlours] = useState<ParlourEntry[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoadingParlours, setIsLoadingParlours] = useState(false);
  
  const fetchParlourTypes = useCallback(async () => { ... });
  const fetchParloursByType = useCallback(async (type: string) => { ... });
  const addNewParlour = useCallback(async (type, name, city, area, map) => { ... });
  
  return { parlourTypes, parlours, fetchParlourTypes, fetchParloursByType, addNewParlour, ... };
}
```

---

#### 4. Frontend: Update FullScreenEventCard

**File: `src/components/client-detail/FullScreenEventCard.tsx`**

Update the Parlour Details Section (lines 748-847) to:

1. **Import and use useParlourData hook** - Similar to useVenueData
2. **Add parlour state variables** - isNewParlour, parlourTypeOpen, parlourNameOpen
3. **Replace Parlour Type dropdown** - Use parlourTypes from Column C instead of venueTypes
4. **Add Parlour Name combobox** - Shows suggestions from the type-specific sheet
5. **Add auto-fill logic** - When parlour selected, populate City, Area, Map Link
6. **Add create-on-save logic** - If parlour doesn't exist, add entry when form is saved

**Current (Using venueTypes incorrectly):**
```tsx
{venueTypes.map((type) => (
  <CommandItem key={type} value={type} onSelect={(val) => setParlourType(val)}>
    {type}
  </CommandItem>
))}
```

**After (Using parlourTypes from Column C):**
```tsx
{parlourTypes.map((type) => (
  <CommandItem key={type} value={type} onSelect={handleParlourTypeChange}>
    {type}
  </CommandItem>
))}
```

---

### Sheet Schema Reference

**"EVENT DETAILS SETUP DATA" Sheet:**
| Column | Content |
|--------|---------|
| A | Venue Types (BANQUET, DECORATION, etc.) |
| C | Parlour Types (MAKEUP STUDIO, BEAUTY PARLOUR, etc.) |

**Type-Specific Sheets (MAKEUP STUDIO, BEAUTY PARLOUR, etc.):**
| Column | Field |
|--------|-------|
| A | NAME |
| B | COMPANY WHATSAPP NUMBER |
| C | COMPANY CONTACT NUMBER |
| D | OWNER 1 |
| E | OWNER 1 CONTACT NO |
| F | OWNER 1 WHATSAPP NO |
| G | OWNER 2 |
| H | OWNER 2 CONTACT NO |
| I | OWNER 2 WHATSAPP NO |
| J | CITY |
| K | AREA |
| L | GOOGLE MAP |
| M | INSTAGRAM |
| N | FACEBOOK |
| O | TIKTOK |
| P | YOUTUBE |
| Q | WEBSITE |
| R | GMAIL |
| S | RATING |

---

### User Experience Flow

1. **User opens Event Details edit form**
2. **Selects Parlour Type** from dropdown (fetched from Column C of setup sheet)
3. **Types Parlour Name** - sees suggestions from that type's sheet (e.g., MAKEUP STUDIO sheet)
4. **Selects existing parlour** - City, Area, Map auto-fill from sheet data
5. **OR types new name** - enters City, Area, Map manually
6. **Saves form** - if parlour is new, creates entry in the type sheet with the 4 fields

---

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/google-sheets/index.ts` | Modify | Add `getParlourTypes`, `getParloursByType`, `addParlourEntry` actions |
| `src/lib/parlour-api.ts` | Create | API helper functions for parlour data |
| `src/hooks/useParlourData.ts` | Create | Custom hook for parlour state management |
| `src/components/client-detail/FullScreenEventCard.tsx` | Modify | Integrate parlour dynamic dropdowns and auto-fill logic |

---

### Technical Details

**Edge Function Changes:**
- `getParlourTypes`: Fetches from `'EVENT DETAILS SETUP DATA'!C2:C100`
- `getParloursByType`: Uses `parlourType.toUpperCase()` as sheet name (same structure as getVenuesByType)
- `addParlourEntry`: Appends to the type-specific sheet with NAME, CITY, AREA, GOOGLE MAP

**FullScreenEventCard Integration:**
- Add `useParlourData` hook import and usage
- Add state: `parlourTypeOpen`, `parlourNameOpen`, `isNewParlour`
- Add handlers: `handleParlourTypeChange`, `handleParlourSelect`, `handleParlourNameInput`
- Update save logic to add new parlour if `isNewParlour` is true
- Connect parlour section dropdowns to the new hook data

---

### Result

After this change:
- Parlour Type dropdown fetches from Column C of "EVENT DETAILS SETUP DATA"
- Parlour Name shows suggestions from the type-specific sheet (e.g., "MAKEUP STUDIO")
- Selecting existing parlour auto-fills City, Area, and Map Link
- New parlours are automatically saved to their type sheet when the form is saved
- Follows the exact same pattern as the Venue implementation
