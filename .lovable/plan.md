

## Plan: Rename columns and enhance confirmation toggle

### Changes

**1. `src/components/files/FullScreenFilesTable.tsx`**

- **Line 341**: Rename column header `Copied` → `Who Copied First?`
- **Line 322**: Update colgroup comment from `Copied` to `Who Copied First?`
- **Line 343**: Rename column header `✓` → `Reconfirmation`
- **Lines 434-438**: Replace the small check/X icon toggle with a prominent text-based toggle:
  - When `confirmed === false`: Show **"NOT CONFIRMED"** in bold red text
  - When `confirmed === true`: Show **"CONFIRMED"** in bold green text
  - Clicking toggles the value as before
- Adjust the `✓` column width (currently 4%) to accommodate the text — increase to ~8%, reduce another column slightly

**2. `src/components/files/FilePathBuilderDialog.tsx`**

- **Line 747**: Rename label from `👤 Who Copied` → `👤 Who Copied First?`

No database or backend changes needed — these are purely UI label/display changes.

