
# ALL CLIENTS -- Monthly Crew Assignment View

## Overview

A new section added to the **Home Screen** (above "Client Tracker" in the left sidebar on desktop, and as a new tab on mobile) showing all booked events for the current Nepali month in a clean table. Each row = one event, with inline freelancer assignment dropdowns and a "Quick Add Freelancer" mini-modal.

## What You Will See

```text
ALL CLIENTS
[ 2082 v ] [ MAGH v ]

| Day | Client          | Event            | PB            | PG           | VB     | VG     | EP     | EV     | Asst   | iPhone | Drone  | FPV    |
|-----|-----------------|------------------|---------------|--------------|--------|--------|--------|--------|--------|--------|--------|--------|
| 15  | Prasanna Mainali| Bride Reception  | Arjun Pandey  | Barun K.     | Assign | Assign | Assign | Assign | Assign | Assign | Assign | Assign |
| 17  | Riya Shrestha   | Wedding          | Ram Sharma    | Assign       | Hari K | Assign | Assign | Assign | Assign | Assign | Assign | Assign |
| 22  | Sita Thapa      | Engagement       | Assign        | Assign       | Assign | Assign | Assign | Assign | Assign | Assign | Assign | Assign |
```

- Default: current BS year + month
- Click any "Assign" cell to open a role-filtered dropdown
- Each dropdown has "+ Add New Freelancer" at the bottom
- Quick Add modal: just Name (required) + Contact Number (required)
- Auto-assigns the role column and saves instantly

---

## Technical Details

### Step 1: New Backend Action -- `getAllFreelancerAssignments`

**File: `supabase/functions/google-sheets/index.ts`**

A new action that reads ALL rows from `BOOKED CLIENTS FREELANCERS` sheet (A2:R1000), splits each row's newline-separated columns into individual event rows, and returns them all. Each returned item includes:
- `registeredDateTimeAD`, `clientName`, `event`, `eventYear`, `eventMonth`, `eventDay`, `eventDateAD`
- All 10 crew fields: `photographerBride` through `fpvOperator`
- `rowNumber` for updates

This is a read-only bulk fetch (no writes). The frontend filters by year/month.

### Step 2: New API Function

**File: `src/lib/freelancer-assignment-api.ts`**

Add `getAllFreelancerAssignments()` function that invokes the new backend action and returns typed data.

Add `quickAddFreelancer(name, contactNo, roleField)` function that:
1. Calls `addFreelancer` with the name, contact, and the correct role set to YES
2. Returns the added freelancer data

### Step 3: New Component -- `AllClientsCrewTable`

**File: `src/components/suite/AllClientsCrewTable.tsx`**

This is the main component containing:
- **Header**: "ALL CLIENTS" title with BS Year and Month dropdowns (defaulting to current)
- **Table**: Horizontally scrollable table with columns: Day, Client, Event, PB, PG, VB, VG, EP, EV, Asst, iPhone, Drone, FPV
- **Crew Cells**: Each crew cell is a clickable dropdown (using Command/Popover) showing role-filtered freelancers from the WTN FREELANCERS sheet. Selecting a name saves immediately via `updateFreelancerAssignment`.
- **Quick Add**: Each dropdown includes a "+ Add New Freelancer" option at the bottom. Clicking it opens a small inline dialog with Name + Contact Number fields. On save, adds the freelancer to the FREELANCERS sheet with the correct role = YES, then auto-assigns them to the current cell.
- **Sorting**: Rows sorted by event day ascending within the filtered month.

### Step 4: Integrate into Desktop Suite

**File: `src/components/suite/SuiteLeftSidebar.tsx`**

Add an "ALL CLIENTS" button at the very top of the sidebar (above the module list) that sets a state to show the crew table in the main content area.

**File: `src/components/suite/SuiteDashboardContent.tsx`**

Add a conditional: when "ALL CLIENTS" is selected from the sidebar, render `AllClientsCrewTable` instead of the normal tabs content.

**File: `src/components/suite/DesktopSuiteLanding.tsx`**

Add state management for `showAllClients` and pass it through the sidebar and dashboard content components.

### Step 5: Integrate into Mobile Suite

**File: `src/components/suite/MobileSuiteLanding.tsx`**

Add a new "Crew" tab in the bottom navigation that renders `AllClientsCrewTable` in a mobile-friendly scrollable layout.

### Step 6: Quick Add Freelancer Dialog

**File: `src/components/suite/QuickAddFreelancerDialog.tsx`**

A small, focused dialog with:
- Name input (required)
- Contact Number input (required)
- Save button that calls `addFreelancer` with role auto-set based on which column triggered it
- On success: refreshes the freelancer list, auto-assigns to the cell, closes dialog

### Data Flow

1. Page loads -> calls `getAllFreelancerAssignments()` to get all rows from BOOKED CLIENTS FREELANCERS
2. Frontend filters by selected BS year + month
3. Splits newline-separated rows into individual event rows
4. Each crew cell shows current assignment or "Assign"
5. Clicking a cell -> fetches freelancers list (cached) -> shows role-filtered dropdown
6. Selection -> calls `updateFreelancerAssignment()` to save to sheet
7. "+ Add New" -> opens QuickAddFreelancerDialog -> saves to FREELANCERS sheet -> auto-assigns

### Files Summary

| File | Action |
|------|--------|
| `supabase/functions/google-sheets/index.ts` | Add `getAllFreelancerAssignments` action |
| `src/lib/freelancer-assignment-api.ts` | Add `getAllFreelancerAssignments()` + `quickAddFreelancer()` |
| `src/components/suite/AllClientsCrewTable.tsx` | New: main crew table component |
| `src/components/suite/QuickAddFreelancerDialog.tsx` | New: minimal add freelancer modal |
| `src/components/suite/SuiteLeftSidebar.tsx` | Add "ALL CLIENTS" button at top |
| `src/components/suite/SuiteDashboardContent.tsx` | Show crew table when selected |
| `src/components/suite/DesktopSuiteLanding.tsx` | Add state for ALL CLIENTS view |
| `src/components/suite/MobileSuiteLanding.tsx` | Add "Crew" tab |
