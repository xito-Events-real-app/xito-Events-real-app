

## Add "Similar" as a Sort Mode Option

### What changes
Add "Similar" as a new option in the existing Sort dropdown (alongside Default, Max Events, etc.). When "Similar" is selected, the event count pills (1, 2, 3...) appear next to the dropdown — no need for `filterDay` to be active first.

### Technical approach — `src/components/suite/AllClientsCrewTable.tsx`

1. **Extend `SortMode` type**: Add `'similar'` to the union type (line 75)

2. **Sort dropdown** (line 992-999): Add `<SelectItem value="similar">Similar</SelectItem>`

3. **When `sortMode === 'similar'`**:
   - Show the event count pills (1, 2, 3... up to `maxEventsPerDay`) next to the sort dropdown, same styling as current pills
   - Default `eventCountFilter` to `null` (show all), clicking a number filters to days with that count
   - `sortedFilteredRows` groups/sorts by day event count ascending

4. **Compute `maxEventsPerDay` and `dayEventCounts`** from all month rows (not just filtered) — these already exist in the component, just need to ensure they're available outside the `filterDay` conditional

5. **Keep existing `filterDay`-based Similar button** as-is for backward compatibility, or remove it since the sort dropdown now covers it — removing is cleaner

### Files changed
- `src/components/suite/AllClientsCrewTable.tsx`

