

## Fix: 2nd/3rd Backup Should Not Auto-Fill Storage Location for All Cards

### Problem
When setting 2nd backup for a specific card (e.g. Card 3), the dialog pre-fills ALL cards with storage type/device from their 1st backup data. On save, it forces ALL cards to have storage + device filled, and saves backup 2 paths for ALL cards — even if user only intended to back up one card.

### Desired behavior
- **1st backup**: All cards share the same storage location — current behavior is correct
- **2nd/3rd backup**: 
  - File info (size, items, format) stays pre-populated from existing data
  - Storage location fields (`storageType`, `deviceId`) start **EMPTY** for all cards
  - Only cards where user explicitly selects a storage location get saved
  - Cards left empty are skipped — no validation error

### Changes to `src/components/files/FilePathBuilderDialog.tsx`

**1. Initialization (lines 122-185):** When `backupNumber >= 2`, load card forms with size/items/format from existing data but set `storageType` and `deviceId` to empty strings.

**2. Validation (lines 391-401):** For `backupNumber >= 2`, skip the "all cards must be complete" validation. Instead, only require at least ONE card to have storage + device filled.

**3. Save logic (lines 472-542):** For `backupNumber >= 2`, skip cards where `storageType` or `deviceId` is empty — don't save backup path for those cards.

### Files changed
1. `src/components/files/FilePathBuilderDialog.tsx` — 3 targeted changes in init, validation, and save

