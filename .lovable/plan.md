
## Dynamic Dropdowns & Auto-Fill for Event Details Form

Based on your requirements, I'll implement a system where the Event Details form fetches venue types from a setup sheet, and when a venue type is selected (like "BANQUET"), it loads the corresponding venue names from that sheet. When a venue is selected, CITY, AREA, and MAP LINK auto-fill. If a venue doesn't exist, it creates a new entry.

---

### Data Flow Architecture

```text
+---------------------------+      +----------------------------+
| EVENT DETAILS SETUP DATA  |      | BANQUET / DECORATION / etc |
| Column A: Venue Types     |      | (Dynamic sheets per type)  |
| - BANQUET                 |  =>  | A: NAME                    |
| - DECORATION              |      | B: COMPANY WHATSAPP        |
| - TRANSPORTATION          |      | ...                        |
| - etc.                    |      | J: CITY, K: AREA, L: MAP   |
+---------------------------+      +----------------------------+
            |                                    |
            v                                    v
   +------------------+              +------------------------+
   | Venue Type       |   triggers   | Venue Name Dropdown    |
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

Add 3 new actions:

| Action | Purpose |
|--------|---------|
| `getEventDetailsSetupData` | Fetch venue types from "EVENT DETAILS SETUP DATA" Column A (row 2+) |
| `getVenuesByType` | Fetch all venues from dynamic sheet (e.g., "BANQUET", "DECORATION") |
| `addVenueEntry` | Add new venue with NAME, CITY, AREA, MAP to the appropriate sheet |

**New Functions:**

```typescript
// Get venue types from EVENT DETAILS SETUP DATA
async function getEventDetailsSetupData(accessToken: string, spreadsheetId: string) {
  const range = "'EVENT DETAILS SETUP DATA'!A2:A100";
  // Returns: ["BANQUET", "DECORATION", "TRANSPORTATION", ...]
}

// Get venues from a specific type sheet (dynamic sheet name)
async function getVenuesByType(accessToken: string, spreadsheetId: string, venueType: string) {
  const sheetName = venueType.toUpperCase();
  const range = `'${sheetName}'!A2:S500`;
  // Returns array with: name, companyWhatsapp, companyContact, owner1, etc.
}

// Add new venue entry to type-specific sheet
async function addVenueEntry(accessToken: string, spreadsheetId: string, venueType: string, venueData: {...}) {
  const sheetName = venueType.toUpperCase();
  // Inserts row with: name, city, area, mapLink
}
```

#### 2. Frontend: New API Helper

**New File: `src/lib/event-venue-api.ts`**

```typescript
export interface VenueEntry {
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

export async function getVenueTypes(): Promise<string[]>;
export async function getVenuesByType(venueType: string): Promise<VenueEntry[]>;
export async function addVenueEntry(venueType: string, data: Partial<VenueEntry>): Promise<void>;
```

#### 3. Frontend: New Custom Hook

**New File: `src/hooks/useVenueData.ts`**

This hook will:
- Fetch and cache venue types on mount
- Fetch venues when type changes
- Handle auto-fill when venue is selected
- Handle adding new venues

```typescript
export function useVenueData() {
  const [venueTypes, setVenueTypes] = useState<string[]>([]);
  const [venues, setVenues] = useState<VenueEntry[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [isLoadingVenues, setIsLoadingVenues] = useState(false);
  
  const fetchVenueTypes = useCallback(async () => { ... });
  const fetchVenuesByType = useCallback(async (type: string) => { ... });
  const addNewVenue = useCallback(async (type, name, city, area, map) => { ... });
  
  return { venueTypes, venues, fetchVenueTypes, fetchVenuesByType, addNewVenue, ... };
}
```

#### 4. Frontend: Update FullScreenEventCard

**File: `src/components/client-detail/FullScreenEventCard.tsx`**

Replace current static venue type dropdown and text input with:

1. **Venue Type Dropdown** - Fetches from `EVENT DETAILS SETUP DATA` Column A
2. **Venue Name Combobox** - Shows suggestions from the type-specific sheet, allows new entries
3. **Auto-fill logic** - When venue selected, populate City, Area, Map Link
4. **Create-on-save** - If venue doesn't exist, add entry when form is saved

**UI Changes:**

```tsx
{/* Venue Details Section */}
<div className="space-y-3 bg-slate-800/40 rounded-lg p-4 border border-slate-700/40">
  {/* Venue Type - Dynamic Dropdown */}
  <Select value={venueType} onValueChange={handleVenueTypeChange}>
    {venueTypes.map(type => (
      <SelectItem key={type} value={type}>{type}</SelectItem>
    ))}
  </Select>

  {/* Venue Name - Combobox with suggestions */}
  <Combobox
    value={venueName}
    options={venues.map(v => v.name)}
    onSelect={handleVenueSelect}  // Auto-fills city, area, map
    onCreateNew={handleCreateNewVenue}
  />

  {/* City, Area, Map - Auto-filled or editable */}
  <Input value={venueCity} ... />
  <Input value={venueArea} ... />
  <Input value={venueMap} ... />
</div>
```

---

### Sheet Schema Reference

**"EVENT DETAILS SETUP DATA" Sheet:**
| Column | Content |
|--------|---------|
| A | Venue Types (BANQUET, DECORATION, etc.) |

**Type-Specific Sheets (BANQUET, DECORATION, etc.):**
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
2. **Selects Venue Type** from dropdown (fetched from setup sheet)
3. **Types Venue Name** - sees suggestions from that type's sheet
4. **Selects existing venue** - City, Area, Map auto-fill from sheet data
5. **OR types new name** - enters City, Area, Map manually
6. **Saves form** - if venue is new, creates entry in the type sheet with the 4 fields

---

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/google-sheets/index.ts` | Modify | Add `getEventDetailsSetupData`, `getVenuesByType`, `addVenueEntry` actions |
| `src/lib/event-venue-api.ts` | Create | API helper functions for venue data |
| `src/hooks/useVenueData.ts` | Create | Custom hook for venue state management |
| `src/components/client-detail/FullScreenEventCard.tsx` | Modify | Integrate dynamic dropdowns and auto-fill logic |

---

### Technical Notes

- The venue type dropdown will dynamically fetch from Column A of "EVENT DETAILS SETUP DATA"
- Each venue type maps to a sheet with the same name (e.g., type "BANQUET" uses "BANQUET" sheet)
- The system follows the existing vendor pattern already in the codebase
- Error handling: If a type's sheet doesn't exist, show empty options and allow manual entry
- Caching: Venue types fetched once, venues fetched on type change
- This same pattern can apply to Parlour details if needed in the future
