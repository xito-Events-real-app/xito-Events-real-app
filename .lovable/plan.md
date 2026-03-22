

## Add "Copied by" & "Copied at" to WhatsApp Message + Fix Date Format

### Current State
- **PDF**: Already includes "Who Copied" and "Backed Up At" — no PDF changes needed
- **WhatsApp message**: Missing these two fields
- **Date format**: Shows `2082/11/4` instead of `Magh 4, 2082` in both WhatsApp message and dialog summary

### Changes — `src/components/files/ReconfirmationDialog.tsx`

1. **Import** `nepaliMonthsEnglish` from `@/lib/nepali-date`

2. **Fix `nepaliDate` formatting** (line 26-29): Convert numeric format to readable:
   ```
   Before: "2082/11/4"
   After:  "Magh 4, 2082"
   ```
   Using: `nepaliMonthsEnglish[month - 1] + " " + day + ", " + year`

3. **Add to WhatsApp message** (after line 70, before "Thank you"):
   ```
   • Copied by: ${file.who_copied || "-"}
   • Copied on: ${backup_1_recorded_at formatted}
   ```

4. **Add to dialog summary** (after the Path row, before the divider): Two new rows showing "Copied By" and "Copied At"

### Changes — `src/lib/file-confirmation-pdf.ts`

5. **Import** `nepaliMonthsEnglish` from `./nepali-date`

6. **Fix `nepaliDate` formatting** (line 35-38): Same readable format `Magh 4, 2082`

### Files changed
- `src/components/files/ReconfirmationDialog.tsx`
- `src/lib/file-confirmation-pdf.ts`

