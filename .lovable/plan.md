

# Redesign Files Expanded Mode & Path Builder Dialog

## Summary

Redesign the expanded file rows in `FullScreenFilesTable` and the `FilePathBuilderDialog` to match the user's exact requirements: bold/straight fonts (no italics), side auto-lock logic, card-based row duplication, and a restructured path builder popup with smart defaults and three sections.

---

## Part 1: Remove Italics, Make Bold & Straight

**Files**: `FullScreenFilesTable.tsx`

- Remove all `italic` and `text-muted-foreground` styling from client names, event names, and event row text (lines 296, 313, 318, 326, 496)
- Make client names and event names `font-bold` instead of italic/muted

---

## Part 2: Expanded Row Redesign — Side & Card Logic

**File**: `FullScreenFilesTable.tsx` (FileRowsTable component, lines 190-291)

### Side Column
- If `file.side` already has a value (set by `CREW_CODE_MAP` during generation — e.g., PB = "BRIDE SIDE", PG = "GROOM SIDE"), display it as a **read-only badge** (not a dropdown)
- If `file.side` is empty (e.g., EP, EV, DRONE), show a Select dropdown. Once a value is selected and saved, it becomes **locked** (read-only) — we update the DB and mark it as set

### Card Column
- Default card value = `1` (set during file row generation in `ensureFileRowsForMonth`)
- Replace the free-text input with a **number selector** (1, 2, 3, 4)
- When card = 2, a **new duplicate row** is created for this freelancer for "Card 2" with the same metadata but `card_label = "2"`
- Each card row is independently editable for file path, size, etc.

**File**: `src/lib/files-api.ts`
- Update `ensureFileRowsForMonth` to set `card_label: "1"` as default for all new rows
- Add a helper function `duplicateFileRowForCard(fileId: string, cardNumber: number)` that clones the row with a new card number

---

## Part 3: File Path Builder Dialog Redesign

**File**: `FilePathBuilderDialog.tsx` — Complete restructure into 3 sections:

### Section 1: Details Header (read-only info bar)
```
"CARD 1 - CLIENT NAME - EVENT NAME - FREELANCER NAME"
```
Displayed as a styled header/banner at the top of the dialog.

### Section 2: Storage & Path Configuration

1. **Storage Type** dropdown: PC / Hard Drive / Drive (existing)
2. **Storage Device** dropdown: filtered by type (existing)
3. **Drive Letter Path** — **only shown when Storage Type = PC**. Shows the `pc_drive_letter` from the selected device
4. **Year Event Folder** — default: `"{EVENT_MONTH} EVENTS {EVENT_YEAR}"` (e.g., "FALGUN EVENTS 2082") derived from the file record's `event_month` and `event_year`. Editable.
5. **Category** dropdown: PHOTOS / VIDEOS
   - Default PHOTOS for PB, PG, EP
   - Default VIDEOS for VB, VG, EV, DRONE, FPV, IPHONE
6. **Client Folder** — default: client name (editable)
7. **Event Folder** — default: event name (editable)
8. **Side** — default: whatever was selected outside in the expanded row. Editable here.
9. **Freelancer** — read-only, freelancer name
10. **Card Label** dropdown:
    - For **Photo roles** (PB, PG, EP): default = "RAW AND JPEG", options include RAW, JPEG, RAW AND JPEG, etc.
    - For **Video roles** (VB, VG, EV, DRONE, FPV, IPHONE): default = "NORMAL", options include NORMAL, CF, CF_NORMAL, etc.

### Section 3: File Info
1. **File Size** — number input in GB
2. **No. of Items** — number input
3. **Save** button to save all data for this card

---

## Part 4: Update `ensureFileRowsForMonth` Defaults

**File**: `src/lib/files-api.ts`

- Set `card_label: "1"` as default for all new rows (line 488 area)
- Ensure `category` defaults are already correct (they are via `CREW_CODE_MAP`)

---

## Files Changed

1. `src/components/files/FullScreenFilesTable.tsx` — Remove italics, bold fonts, side lock logic, card number with row duplication
2. `src/components/files/FilePathBuilderDialog.tsx` — Full restructure: 3-section layout, smart defaults, conditional drive letter, card label dropdowns by role
3. `src/lib/files-api.ts` — Default card_label to "1", add `duplicateFileRowForCard` helper

