

# Smart Storage Display: TB Input with GB Storage

## Overview
Update the Add Device dialog to accept total storage in TB (since most devices are 1TB+), while continuing to store data in GB in the database (1 TB = 1024 GB). Display values smartly on device cards -- show remaining space in GB when it's less than 1 TB.

## Changes

### 1. Update Add Device Dialog (`AddStorageDeviceDrawer.tsx`)
- Change the "Total Storage" label from "Total Storage (GB)" to "Total Storage (TB)"
- On save, convert TB to GB: `total_storage_gb = Number(form.total_storage_tb) * 1024`
- When editing, convert existing GB value back to TB for display: `total_storage_tb = String(device.total_storage_gb / 1024)`
- Rename the form field from `total_storage_gb` to `total_storage_tb` (internal form state only)

### 2. Update Device Cards Display (`StorageDevicesSection.tsx`)
- Add a helper function `formatStorage(gb)` that:
  - If `gb >= 1024`: display as `X.XX TB`
  - If `gb < 1024`: display as `X GB`
- Apply this to three display points on each card:
  - "used" label: e.g. "0.5 TB used" or "800 GB used"
  - "free" label: e.g. "1.5 TB free" or "200 GB free"  
  - "total" label: e.g. "2 TB total"
- The remaining space specifically shows in GB if under 1 TB (per user request)

### Technical Details

**Conversion helper:**
```typescript
const formatStorage = (gb: number): string => {
  if (gb >= 1024) return `${(gb / 1024).toFixed(2).replace(/\.?0+$/, '')} TB`;
  return `${Math.round(gb)} GB`;
};
```

**Save conversion (dialog):**
```typescript
total_storage_gb: Number(form.total_storage_tb) * 1024
```

**Edit pre-fill (dialog):**
```typescript
total_storage_tb: String(editDevice.total_storage_gb / 1024)
```

**Files to update:**
1. `src/components/files/AddStorageDeviceDrawer.tsx` -- TB input + conversion on save/edit
2. `src/components/files/StorageDevicesSection.tsx` -- smart display formatting

