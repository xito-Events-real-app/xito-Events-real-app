

# Download & Upload Backup for All Clients Crew Assignments

## Overview

Add two buttons to the All Clients page header bar:
- **Download Backup** -- exports the currently displayed crew assignments as a CSV file with a date-stamped filename
- **Upload & Restore** -- accepts a CSV file and writes the assignments back to the FREELANCERS sheet, matching rows by a composite unique key

## Unique Identifier

Each row will be identified by a composite key of three columns:
- `registeredDateTimeAD` (unique client ID)
- `clientName`
- `event` (event name)

On re-upload, the system matches each CSV row to the correct sheet row using this composite key and updates the 10 crew assignment columns.

## What Gets Exported

The CSV will contain these columns:

| registeredDateTimeAD | clientName | event | eventDateAD | eventYear | eventMonth | eventDay | PB | VB | PG | VG | EP | EV | Asst | iPhone | Drone | FPV |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

- First 7 columns are identifiers (read-only context)
- Last 10 columns are the crew assignments (editable)

## Changes

### 1. `src/components/suite/AllClientsCrewTable.tsx`

**Add two buttons to the header bar** (next to the Refresh button):

- **Download icon button**: Generates a CSV from `filteredRows` (current month view) and triggers a browser download with filename like `crew-backup-2082-Jestha-2026-02-14.csv`
- **Upload icon button**: Opens a hidden file input, reads the CSV, and sends it to a new backend action

**Download logic** (pure frontend, no backend needed):
- Convert `filteredRows` to CSV string with headers
- Create a Blob and trigger download via a temporary anchor element

**Upload logic**:
- Parse the CSV file in the browser
- For each row, extract the composite key and the 10 crew field values
- Send the parsed data to a new `restoreFreelancerAssignments` backend action
- On success, reload the data

### 2. `supabase/functions/google-sheets/index.ts`

**Add new action: `restoreFreelancerAssignments`**

- Accepts an array of objects: `{ registeredDateTimeAD, event, field, value }[]`
- For each entry, finds the matching row in the FREELANCERS sheet by `registeredDateTimeAD` and event name
- Updates the corresponding crew column value
- Uses batch updates for efficiency (single API call for all changes)

This reuses the existing `updateFreelancerAssignment` matching logic but in bulk.

## Technical Details

**CSV generation (frontend):**
```
const headers = ['registeredDateTimeAD','clientName','event','eventDateAD',
  'eventYear','eventMonth','eventDay',
  'photographerBride','videographerBride','photographerGroom',
  'videographerGroom','extraPhotographer','extraVideographer',
  'assistant','iphoneShooter','droneOperator','fpvOperator'];

const csvRows = filteredRows.map(row =>
  headers.map(h => `"${(row[h] || '').replace(/"/g, '""')}"`).join(',')
);
```

**CSV parsing (frontend):**
- Split by newlines, split by commas, handle quoted values
- Match headers to field names
- Build update payload array

**Backend restore action:**
- Read FREELANCERS sheet column A + event column to build row map
- For each restore entry, find matching row number
- Batch update all crew columns using `values:batchUpdate` API
- Return count of matched and updated rows

**UI placement:** Two small icon buttons (Download and Upload icons from lucide-react) placed in the header bar between the stats and the close button.
