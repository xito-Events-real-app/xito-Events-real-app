

## Plan: Add CLOUD Device Type to Storage Devices

### Database Migration
Add `cloud_type` and `expiry_date_ad` columns to `storage_devices`:
```sql
ALTER TABLE public.storage_devices
  ADD COLUMN cloud_type text DEFAULT '',
  ADD COLUMN expiry_date_ad text DEFAULT '';
```

### Files to Change

**1. `src/lib/files-api.ts`** — Add `cloud_type` and `expiry_date_ad` to `StorageDevice` interface.

**2. `src/components/files/AddStorageDeviceDrawer.tsx`**
- Add `"CLOUD"` to device type dropdown.
- Add `cloud_type` and `expiry_date_ad` to form state.
- When `device_type === "CLOUD"`: show Cloud Type dropdown (Google Drive, pCloud), hide health/safety/speed/purchase price/purchased from fields, show Expiry Date (AD) with calendar picker instead.
- On save, pass `cloud_type` and `expiry_date_ad` fields.

**3. `src/components/files/StorageDevicesSection.tsx`**
- Add Cloud icon import and mapping for `device_type === "CLOUD"`.
- On cloud device cards: show cloud type label and expiry date instead of health/safety/speed badges.
- Show expiry warning if date is past or within 30 days.

**4. `src/pages/FileManagement.tsx`** — Add `{ key: "CLOUD", label: "Cloud", icon: Cloud }` to mobile `DEVICE_TYPES` chips.

**5. `src/components/files/FileManagementSidebar.tsx`** — Add `{ key: "CLOUD", label: "Cloud", icon: Cloud }` to sidebar `DEVICE_TYPES`.

**6. `supabase/functions/google-sheets/index.ts`** — Add CLOUD config to `pushStorageDevicesToSheetAction`:
- Add `{ sheetName: 'CLOUD', deviceType: 'CLOUD', hasDriveLetter: false }` to `sheetConfigs`.
- For CLOUD devices, map columns: `A=Cloud Type, B=Cloud Name, C=Total Storage, D=Used, E=Remaining, F=Expiry Date AD` (6 columns, range `A:F`).
- Use a separate mapping branch for CLOUD (like PC has its own branch).
- Since the CLOUD sheet already exists, just clear+write like other device types.

