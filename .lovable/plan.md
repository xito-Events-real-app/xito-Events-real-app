

# Upgrade Add Device to Modern Dialog with Smart Date Conversion

## Overview
Replace the bottom Drawer with a centered Dialog popup, modernize the UI, simplify Safety Status to SAFE/RISKY only, and add automatic AD-to-BS and BS-to-AD date conversion when entering purchase dates.

## Changes

### 1. Rewrite `AddStorageDeviceDrawer.tsx` as a Dialog
**File:** `src/components/files/AddStorageDeviceDrawer.tsx`

- Replace `Drawer`/`DrawerContent`/`DrawerHeader`/`DrawerTitle` with `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` from `@/components/ui/dialog`
- Modern centered popup with clean spacing, rounded corners, max-w-lg
- Component name stays the same (no rename needed since all imports reference it)

### 2. Safety Status: SAFE / RISKY only
- Remove "SLOW" and "UNSAFE" options
- Replace with just two options: `SAFE` and `RISKY`
- Update default value to `"SAFE"`

### 3. Auto-convert Purchase Date AD <-> BS
- When user types a valid AD date (`YYYY-MM-DD`), auto-compute and fill the BS field using `adToBS()` + `formatBSDate()`
- When user types a valid BS date (e.g. `2082 10 15` or changes the field), auto-compute and fill the AD field using `bsToAD()`
- Use a flag to prevent infinite update loops between the two fields
- Import `adToBS`, `bsToAD`, `formatBSDate` from `@/lib/nepali-date`

### 4. Modern UI Polish
- Subtle section groupings with light dividers
- Icon accents next to section headers (HardDrive icon for device info, Calendar for dates, etc.)
- Consistent input sizing with `h-10` inputs
- Blue gradient save button matching the file management theme

## Technical Details

**Date conversion logic:**
```
// AD -> BS
const handleADChange = (val: string) => {
  set("purchase_date_ad", val);
  // Try parse YYYY-MM-DD
  const parts = val.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const date = new Date(val);
    if (!isNaN(date.getTime())) {
      const bs = adToBS(date);
      set("purchase_date_bs", formatBSDate(bs));
    }
  }
};

// BS -> AD (parse "DD MonthName YYYY" format)
const handleBSChange = (val: string) => {
  set("purchase_date_bs", val);
  // Try parse "15 Magh 2082" format
  // Extract day, month name, year -> bsToAD() -> format as YYYY-MM-DD
};
```

**Safety status mapping:** The existing `StorageDevicesSection` already handles badge display via `safetyBadge()`. We update:
- `"SAFE"` stays as green badge
- `"RISKY"` replaces both `"SLOW"` and `"UNSAFE"` -- rendered as red badge

**Files to update:**
1. `src/components/files/AddStorageDeviceDrawer.tsx` -- main rewrite (Drawer -> Dialog, safety options, date auto-convert)
2. `src/components/files/StorageDevicesSection.tsx` -- update `safetyBadge()` to handle `"RISKY"` instead of `"SLOW"`/`"UNSAFE"`, update `isUnsafe` check to `device.safety_status === "RISKY"`
