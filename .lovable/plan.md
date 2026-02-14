

# Expanded Client Panel with More Fields + Bigger Text in Benzo Keep

## What Changes

### 1. Expanded Quick-Add Form Fields (Horizontal Scroll)
The top bar currently only has Name, Phone, WhatsApp, Source. This will be expanded to include ALL key fields in a single horizontal scrollable row:

- **Client Name** (text)
- **Contact No** (tel)
- **WhatsApp No** (tel)
- **Source** (dropdown)
- **Handler** (dropdown from whatsappOwners)
- **Status** (dropdown from clientStatuses)
- **Events** (text, e.g. "Wedding")
- **Event Year** (text)
- **Event Month** (dropdown or text)
- **Event Day** (text)
- **Full Form** button

All laid out horizontally with `overflow-x-auto` so users can scroll through them. Inputs will be bigger (h-9 instead of h-7, text-sm instead of text-xs).

### 2. Recent Clients Section Below Quick-Add (Not Inline)
Currently recent clients are squeezed inline with the form. Instead:
- Recent clients row moves to a **separate row below** the quick-add form, still inside the top bar area
- Displayed as scrollable chips/pills with larger text (text-sm)
- Clear visual separation between "New Client" form row and "Recent Clients" row

### 3. Increased Text Sizes Throughout
- Form inputs: `h-9 text-sm` (up from `h-7 text-xs`)
- Labels: `text-sm` (up from `text-[11px]`)
- Recent client chips: `text-sm` (up from `text-xs`)
- Search input: `h-8 text-sm`

### 4. QuickClientData Interface Expanded
Add new fields to match the expanded form:
```
export interface QuickClientData {
  clientName: string;
  contactNo: string;
  whatsappNo: string;
  source: string;
  clientHandler: string;    // NEW
  initialStatus: string;    // NEW
  events: string;           // NEW
  eventYear: string;        // NEW
  eventMonth: string;       // NEW
  eventDay: string;         // NEW
}
```

## Technical Details

### Files Modified

**`src/components/suite/BenzoKeepClientPanel.tsx`**
- Expand `QuickClientData` interface with new fields
- Horizontal layout: render all fields in a single scrollable `overflow-x-auto` flex row
- Move `RecentClientsList` to a second row below the form (not inline)
- Increase all text sizes (inputs h-9 text-sm, labels text-sm, chips text-sm)
- Add new dropdowns: Handler (from `whatsappOwners`), Status (from `clientStatuses`)
- Add text inputs: Events, Event Year, Event Month, Event Day
- Add new props: `handlers`, `statuses` for the new dropdowns

**`src/components/suite/BenzoKeepNotepadDialog.tsx`**
- Update `QuickClientData` default state to include new empty fields
- Pass `handlers` (whatsappOwners) and `statuses` (clientStatuses) from dropdownData to the panel
- Map new fields when creating a client via `addClient()`

### Desktop Layout (Top Bar)
```
+---------------------------------------------------------------+
| ROW 1: [Name] [Phone] [WA] [Source v] [Handler v] [Status v]  |
|        [Events] [Year] [Month] [Day] [Full Form]  --> scroll  |
+---------------------------------------------------------------+
| ROW 2: Recent: [Search...] [Client1] [Client2] [Client3] ...  |
+---------------------------------------------------------------+
```

### Mobile Layout
Stays as collapsible accordion with vertical stacking of all fields.

