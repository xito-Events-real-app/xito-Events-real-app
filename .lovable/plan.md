

## Plan: Smart PC Name & Drive Letter Dropdowns

### Changes to `src/components/files/AddStorageDeviceDrawer.tsx`

**1. Fetch existing PC names from `storage_devices` table**
- Query `storage_devices` where `device_type = 'PC'` to get distinct `device_name` values (e.g., "SABIN PC", "SAUGAT PC")
- Load on mount via `useEffect` with supabase query

**2. When device_type is "PC", replace Device Name input with a combobox**
- Label changes to "PC Name"
- Dropdown shows existing PC names from the database
- Also allows typing a new name manually (combobox pattern using `FormCombobox` or a custom Popover+Command)

**3. Replace Drive Letter text input with a combobox dropdown**
- Options: C, D, E, F, G, H, I, J, K, L, M, N, O, P, Q, R, S, T, U, V, W, X, Y, Z, A, B
- Also allows typing manually for edge cases
- Use same combobox pattern

**Implementation**: Use the existing `FormCombobox` component from `src/components/form/FormCombobox.tsx` which already supports dropdown + manual entry. Import it and wire up both fields when `device_type === "PC"`.

