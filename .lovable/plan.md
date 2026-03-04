

## Fix Card Column: Show "Card 1/2/3" and Separate Card Label from Format Type

### Problem
The `card_label` field is being overwritten with format type values ("NORMAL", "RAW AND JPEG") instead of staying as numeric identifiers ("1", "2", "3"). This happens because:
1. Auto-generation correctly sets `card_label: "1"` 
2. But `FilePathBuilderDialog` initializes `cardLabel` in the form to format values (line 134: `isPhotoRole ? "RAW AND JPEG" : "NORMAL"`) and saves it back to `card_label` (line 288)
3. So after the first save, `card_label` becomes "NORMAL" instead of "1"

### Solution

**File: `src/components/files/FilePathBuilderDialog.tsx`**

1. **Remove `cardLabel` from `CardFormData`** — it should not be editable. The card number is determined by position (1, 2, 3, 4).

2. **Fix initialization** (lines 134, 155): Stop setting `cardLabel` to format values. Instead, initialize `formatType` with the default format if it's empty:
   - Line 134: Remove `cardLabel` init, set `formatType` to `isPhotoRole ? "RAW AND JPEG" : "NORMAL"` if empty
   - Line 155: Same for other card forms

3. **Fix "Add Card" handler** (line 232): Remove `cardLabel` from new card init, keep `formatType` default

4. **Fix save logic** (lines 288, 353): Instead of saving `form.cardLabel` to `card_label`, save the actual card number (the key from the cardForms map, e.g., "1", "2", "3")

5. **Fix path building** (lines 202, 277, 342): Use the card number (not format label) for path building's `cardLabel` param

**File: `src/components/files/FullScreenFilesTable.tsx`**

6. **Card column display** (line 305): Already shows `Card {number}` — will work correctly once the data is fixed

### Card Management Flow (unchanged but clarified)
- When user opens the path builder, they can add cards (up to 4)
- Each card tab represents Card 1, Card 2, etc.
- Each card has its own storage/device/format/size configuration  
- All cards must have details filled before saving (enforce validation)
- The `card_label` DB field stores only the numeric value ("1", "2", "3", "4")
- The `format_type` DB field stores the format ("NORMAL", "RAW AND JPEG", etc.)

### Save Validation
- When multiple cards exist, validate that ALL cards have required fields (storage type, device) before allowing save
- Show a toast error if any card is incomplete: "Please fill details for all cards before saving"

