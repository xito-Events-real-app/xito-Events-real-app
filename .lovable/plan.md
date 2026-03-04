

## Plan: Toggle Filters + Add Freelancer Name Filter

### Changes — `src/components/files/FullScreenFilesTable.tsx`

**1. Toggle device filter (click again to remove)**

Currently `BackupPill` calls `onDeviceClick(deviceName)` which always sets. Change it to toggle:
- Line 88: `onDeviceClick(deviceName)` → `onDeviceClick(prev => prev === deviceName ? null : deviceName)` — but since `onDeviceClick` is `setFilterDevice`, we need to change the call pattern.
- Instead, update `BackupPill`'s onClick to pass a toggle-aware callback. Simplest: change `onDeviceClick` prop type or wrap at call site.
- Solution: Replace `onDeviceClick={setFilterDevice}` with `onDeviceClick={(name) => setFilterDevice(prev => prev === name ? null : name)}` at all 6 call sites.
- Same for the cloud pill inline onClick (line 436).

**2. Add freelancer name filter**

- New state: `const [filterFreelancer, setFilterFreelancer] = useState<string | null>(null)`
- Filter logic (after device filter ~line 219): filter assignment rows where any file's `freelancer_name` matches `filterFreelancer`.
- Add to `filteredRows` deps.

**3. Make freelancer names clickable (toggle filter)**

- Desktop table (line 377): Change `<span className="font-bold cursor-default">` to clickable with `onClick` that toggles `filterFreelancer`.
- Mobile view (line 582): Same treatment.

**4. Add filter chip for freelancer**

- In filter chips section (line 698): add `filterFreelancer` to condition.
- Add badge: `Freelancer: {filterFreelancer} ✕`
- Add to "Clear all" handler (line 716).

