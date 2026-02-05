
## Feature: "Benzo Keep" - Google Keep-style Note-Taking System

### Overview
Add a "Benzo Keep" feature to the Client Detail page that functions like Google Keep, allowing users to write rich notes with marker colors, automatic date/month highlighting, stored in Column AL of CLIENT TRACKER or BOOKED CLIENTS sheets.

---

### User Experience

1. **Top Button**: A "Benzo Keep" button on the client page header (next to Sync/Edit buttons)
2. **Popup Dialog**: Opens a Google Keep-inspired note editor with:
   - White background for comfortable writing
   - Marker/highlight color picker (Yellow, Green, Pink, Blue, Orange)
   - Auto-highlighting for dates (e.g., "January 15", "15th", "2082/02/05") and months
   - Text area for rich note content
3. **Sidebar Tab**: New "Keep Notes" section in the left sidebar for read-only viewing
4. **Edit Mode**: Clicking the note or "Edit" button opens the popup for modifications
5. **Persistent Storage**: Notes saved to Column AL with auto-save on dialog close

---

### Technical Implementation

#### 1. New Component: `BenzoKeepDialog.tsx`
Location: `src/components/client-detail/BenzoKeepDialog.tsx`

Features:
- Dialog popup with white background and Google Keep aesthetic
- Marker color selector (5 colors: Yellow, Green, Pink, Blue, Orange)
- Rich text area that auto-highlights dates and Nepali months
- Save/Cancel actions
- Loading state for API calls

```text
+----------------------------------+
|  [X]     Benzo Keep              |
+----------------------------------+
|  Color: [Y] [G] [P] [B] [O]      |
+----------------------------------+
|                                  |
|  [ Note content with auto-       |
|    highlighted "January 15" and  |
|    "2082 Magh" styled text ]     |
|                                  |
+----------------------------------+
|         [Cancel] [Save Note]     |
+----------------------------------+
```

#### 2. Sidebar Tab Addition
File: `src/components/client-detail/ClientDetailSidebar.tsx`

Add new section type and sidebar item:
```typescript
export type SectionType = 'dashboard' | 'events' | 'clientDetails' | 'registration' | 
                          'inquiry' | 'sales' | 'activity' | 'comments' | 'financials' | 'keepNotes';

// Add to sidebarItems array:
{ id: 'keepNotes', label: 'Keep Notes', icon: StickyNote }
```

#### 3. Data Schema Extension
File: `src/lib/sheets-api.ts`

Add to `ClientData` interface:
```typescript
benzoKeepNotes?: string;  // Column AL - Benzo Keep notes (JSON format)
```

Storage Format (JSON in Column AL):
```json
{
  "content": "Meeting scheduled for January 15...",
  "markerColor": "yellow",
  "highlightedText": ["January 15", "Magh 25"],
  "lastUpdated": "2026-02-05T10:30:00Z"
}
```

#### 4. Backend API Function
File: `supabase/functions/google-sheets/index.ts`

New action: `updateBenzoKeepNotes`
- Updates Column AL (index 37)
- Uses intelligent sheet routing (CLIENT TRACKER or BOOKED CLIENTS)
- Row verification via `registeredDateTimeAD`

#### 5. Frontend API Function
File: `src/lib/sheets-api.ts`

```typescript
export async function updateBenzoKeepNotes(
  rowNumber: number,
  notesData: string,
  registeredDateTimeAD?: string
): Promise<{ success: boolean; benzoKeepNotes: string }> {
  return callSheetsFunction<{ success: boolean; benzoKeepNotes: string }>("updateBenzoKeepNotes", {
    data: { rowNumber, notesData, registeredDateTimeAD },
  });
}
```

#### 6. ClientDetail.tsx Updates
- Add state for `showKeepDialog` and `currentKeepNotes`
- Add "Benzo Keep" button in header (both mobile and desktop)
- Add "keepNotes" section rendering in content area
- Handle save/load of notes

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/client-detail/BenzoKeepDialog.tsx` | Keep-style note editor dialog |
| `src/components/client-detail/BenzoKeepViewer.tsx` | Read-only notes display for sidebar section |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/client-detail/ClientDetailSidebar.tsx` | Add 'keepNotes' to SectionType and sidebar items |
| `src/components/client-detail/index.ts` | Export new components |
| `src/lib/sheets-api.ts` | Add `benzoKeepNotes` to ClientData, add `updateBenzoKeepNotes` function |
| `supabase/functions/google-sheets/index.ts` | Add `updateBenzoKeepNotes` action handler |
| `src/pages/ClientDetail.tsx` | Add Keep button, dialog state, section rendering |
| `src/components/client-detail/ClientHeroSection.tsx` | Add Keep button next to edit/sync buttons |

---

### Date/Month Auto-Highlighting Logic

The system will automatically detect and highlight:
1. **English Dates**: "January 15", "Feb 20th", "15/01/2026"
2. **Nepali Months**: "Magh", "Falgun", "2082/01/25"
3. **Relative Dates**: "next week", "tomorrow"

Highlighting is visual-only (applied on render) and doesn't modify stored text.

---

### Color Palette

| Color | Use Case | Hex |
|-------|----------|-----|
| Yellow | Default/Important | #FEF08A |
| Green | Confirmed/Done | #BBF7D0 |
| Pink | Urgent/Priority | #FBCFE8 |
| Blue | Information | #BFDBFE |
| Orange | Follow-up | #FED7AA |

---

### Mobile Responsiveness

- Keep button visible in mobile header
- Dialog is full-screen on mobile (Sheet component)
- Tab for "Keep Notes" added to mobile horizontal tabs
- Touch-friendly color picker

---

### Summary

This feature adds a Google Keep-inspired note-taking system to each client record with:
- Rich note editing with marker colors
- Automatic date/month highlighting
- Dedicated sidebar section for quick viewing
- Data persistence in Column AL
- Sheet-aware routing (Tracker vs Booked)
