

## Plan: PC Name + Drive Letter Selection in FilePathBuilderDialog

### Current Behavior
When storage type is "PC", the Device dropdown shows all PC devices (e.g., "SABIN PC (500GB)", "SAUGAT PC (200GB)"). The drive letter is shown read-only after selection.

### Desired Behavior
When storage type is "PC", replace the single Device dropdown with:
1. **PC Name** dropdown — shows distinct PC names (SABIN PC, SAUGAT PC, etc.) from `filteredDevices`
2. **Drive Letter** dropdown — shows drive letters available for the selected PC name, picking the actual device

### Changes to `src/components/files/FilePathBuilderDialog.tsx`

**Add state:**
- `pcName` state to track selected PC name (derived from existing devices, not a new query)

**Modify the Storage & Path column (lines 611-643):**
- When `storageType === "PC"`, render a 3-field layout: Storage Type | PC Name | Drive Letter
- PC Name: `<Select>` with unique PC names extracted from `filteredDevices` (deduplicated by `device_name`)
- Drive Letter: `<Select>` with drive letters from devices matching the selected PC name; selecting a letter sets `deviceId` to the matching device
- When `storageType !== "PC"`, keep existing Device dropdown as-is

**Reset logic:**
- When `storageType` changes to PC, clear `deviceId` and `pcName`
- When `pcName` changes, clear `deviceId` (so user must pick drive letter)
- When dialog opens with existing PC device, derive `pcName` from the selected device

**Remove the separate read-only drive letter section** (lines 639-644) since it's now integrated into the selection flow.

