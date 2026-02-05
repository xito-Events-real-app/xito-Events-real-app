
## Feature: Benzo Keep Section in Xito Business Suite Sidebar

### Overview
Add a "Benzo Keep" section below the Star Clients section in the Suite left sidebar with two features:
1. **Benzo Keep** - Opens a notes page (showing all clients with notes)
2. **Unassigned Benzo Keep** - Notes stored in Column AM of CLIENT TRACKER (not tied to any client)

Unassigned notes can be transferred/assigned to a specific client, moving the content to that client's Column AL.

---

### Data Storage Architecture

| Column | Index | Purpose |
|--------|-------|---------|
| AL | 37 | `benzoKeepNotes` - Client-assigned notes (existing) |
| AM | 38 | `unassignedBenzoKeepNotes` - Unassigned notes (NEW) |

**Unassigned Notes Storage Strategy:**
- Use Column AM of CLIENT TRACKER sheet
- Any row can be used since the note is not tied to a specific client
- Store as JSON array: `[{ id, content, markerColor, createdAt, lastUpdated }]`
- Use a dedicated "system row" (Row 2 or first available) for unassigned notes

---

### Technical Implementation

#### 1. Backend - New API Actions (Edge Function)

**File**: `supabase/functions/google-sheets/index.ts`

Add 3 new actions:

| Action | Purpose |
|--------|---------|
| `getUnassignedBenzoKeepNotes` | Fetch all unassigned notes from Column AM |
| `saveUnassignedBenzoKeepNote` | Add/update unassigned note in Column AM |
| `transferBenzoKeepNote` | Move note from AM to client's AL column |

**Storage Format (Column AM, Row 2):**
```json
[
  {
    "id": "1707148800000",
    "content": "Check venue pricing for...",
    "markerColor": "yellow",
    "createdAt": "2026-02-05T10:00:00Z",
    "lastUpdated": "2026-02-05T10:00:00Z"
  },
  ...
]
```

#### 2. Frontend - New API Functions

**File**: `src/lib/sheets-api.ts`

Add 3 new functions:
```typescript
// Get all unassigned notes
export async function getUnassignedBenzoKeepNotes(): Promise<UnassignedNote[]>

// Save/create an unassigned note
export async function saveUnassignedBenzoKeepNote(note: UnassignedNote): Promise<{ success: boolean }>

// Transfer note to a client (removes from AM, adds to client's AL)
export async function transferBenzoKeepNote(
  noteId: string, 
  targetClientRegisteredDateTimeAD: string
): Promise<{ success: boolean }>
```

#### 3. New Interface Types

**File**: `src/lib/sheets-api.ts`

```typescript
export interface UnassignedBenzoNote {
  id: string;           // Timestamp-based unique ID
  content: string;
  markerColor: 'yellow' | 'green' | 'pink' | 'blue' | 'orange';
  createdAt: string;
  lastUpdated: string;
}
```

#### 4. Suite Left Sidebar Update

**File**: `src/components/suite/SuiteLeftSidebar.tsx`

Add a new section below Star Clients:
- "Benzo Keep" button with avatar icon - shows dialog with assigned notes list
- "Unassigned Benzo Keep" button - opens dialog for creating/viewing unassigned notes

```text
+-----------------------------------+
|  ★ Star Clients                   |
|  [Benzo     | 3 star clients]     |
|  [Barun     | 2 star clients]     |
|  [Nikit     | 1 star clients]     |
+-----------------------------------+
|  📒 Benzo Keep                    |
|  [👤 Benzo Keep] → Shows assigned |
|  [📋 Unassigned] → Shows unassigned|
+-----------------------------------+
```

#### 5. New Components

| Component | Purpose |
|-----------|---------|
| `SuiteBenzoKeepSection.tsx` | Sidebar section with Benzo Keep buttons |
| `UnassignedBenzoKeepDialog.tsx` | Dialog for viewing/adding unassigned notes |
| `UnassignedNoteCard.tsx` | Card component for each unassigned note |
| `AssignNoteDialog.tsx` | Client picker dialog to transfer note |

#### 6. Unassigned Benzo Keep Dialog

Features:
- List of all unassigned notes
- "Add New Note" button to create new unassigned note
- Each note card has:
  - Note content with date highlighting
  - Color indicator
  - "Assign to Client" button
  - Edit/Delete buttons

#### 7. Assign Note Dialog (Client Picker)

When user clicks "Assign to Client":
- Show searchable dropdown of clients from CLIENT TRACKER
- Sorted by most recently added (descending order of registeredDateTimeAD)
- On selection:
  1. Call `transferBenzoKeepNote` API
  2. Remove note from Column AM array
  3. Append note content to client's Column AL (merging if exists)
  4. Show success toast with link to client page

---

### API Flow for Transfer

```text
User clicks "Assign to Client" on unassigned note
         ↓
AssignNoteDialog opens with client list (recently added first)
         ↓
User selects "Prabhat Khatiwoda"
         ↓
API: transferBenzoKeepNote(noteId, clientRegDateTimeAD)
         ↓
Backend:
  1. Read Column AM, find note by ID
  2. Remove note from AM array, write back
  3. Read client's AL column (existing notes)
  4. Merge/append new note content
  5. Write to client's AL column
         ↓
Frontend: Success toast, refresh unassigned list
```

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/suite/SuiteBenzoKeepSection.tsx` | Sidebar section for Benzo Keep |
| `src/components/suite/UnassignedBenzoKeepDialog.tsx` | Dialog for unassigned notes |
| `src/components/suite/AssignNoteDialog.tsx` | Client picker for note transfer |
| `src/hooks/useUnassignedBenzoKeepNotes.ts` | Hook for fetching unassigned notes |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/suite/SuiteLeftSidebar.tsx` | Add Benzo Keep section below Star Clients |
| `src/lib/sheets-api.ts` | Add `UnassignedBenzoNote` type, 3 new API functions |
| `supabase/functions/google-sheets/index.ts` | Add 3 new action handlers |

---

### User Experience

1. User opens Xito Business Suite homepage
2. In left sidebar, below Star Clients, sees "Benzo Keep" section
3. **Benzo Keep button**: Shows all clients with notes (could navigate to client detail)
4. **Unassigned button**: Opens dialog with unassigned notes
5. User can:
   - Add new unassigned note
   - Edit/delete existing notes
   - Click "Assign to Client" → pick client from list → note transfers

---

### Mobile Consideration

For mobile (MobileSuiteLanding), this section could be added to the Home tab or as a floating action button for quick access.
