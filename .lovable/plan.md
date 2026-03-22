

## Replace Device Dropdown with Searchable Command Popup

### Problem
The device `Select` dropdown in the File Path Builder is too long and hard to navigate. Need a searchable popup (like Windows File Explorer) instead.

### Approach
Replace the three device `Select` dropdowns (Device, PC Name, Drive Letter) with `Popover + Command` searchable popups — same pattern already used by `FormCombobox` and `CitySelector` in this project.

### Changes — `src/components/files/FilePathBuilderDialog.tsx`

**1. Add imports**
- Import `Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList` from `@/components/ui/command`
- Import `Popover, PopoverContent, PopoverTrigger` from `@/components/ui/popover`
- Import `ChevronsUpDown, Check` from lucide-react

**2. Replace Device Select (lines 678-691)** — non-PC storage types
- Replace `Select` with `Popover + Command` combo
- Devices sorted alphabetically by `device_name`
- Searchable input filters by device name
- Shows device name + remaining storage in each item
- Displays check icon on selected device

**3. Replace PC Name Select (lines 654-663)**
- Same pattern: `Popover + Command` with search
- PC names sorted alphabetically

**4. Replace Drive Letter Select (lines 665-675)**
- Same pattern for drive letter selection
- Shows drive letter + remaining storage

**5. Add local open states**
- `devicePopoverOpen`, `pcNamePopoverOpen`, `drivePopoverOpen` — three boolean states for each popover

### Files to modify
- `src/components/files/FilePathBuilderDialog.tsx`

