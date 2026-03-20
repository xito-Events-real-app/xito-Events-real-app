

## "Similar Events" Filter for All Clients Crew Table

### What it does

When you're viewing a filtered day (e.g., Day 7 with 3 events), two new controls appear in the header bar next to "Expand All":

1. **"Similar" toggle button** — When turned ON, it finds all other dates in the current month that have the **same number of events** as the currently filtered day (e.g., 3 events), and shows those dates too, sorted in ascending order by day number.

2. **Event count pills (1, 2, 3, ... N)** — Clickable number buttons that appear next to Similar. Clicking "2" shows only dates with exactly 2 events. The maximum number shown is dynamically computed from the highest event count any single day has in the current month.

- Both controls only appear when a day filter (`filterDay`) is active.
- "Similar" and the number pills are mutually exclusive — clicking a number disables Similar and vice versa.
- Clicking the active number again clears the filter back to just the original day.

### Technical Approach

**File: `src/components/suite/AllClientsCrewTable.tsx`**

#### New State
```typescript
const [similarMode, setSimilarMode] = useState(false);
const [eventCountFilter, setEventCountFilter] = useState<number | null>(null);
```

#### Computed Values (useMemo)
- `dayEventCounts`: A `Map<string, number>` counting events per day for the current month (from the unfiltered month rows, not `filteredRows`)
- `maxEventsPerDay`: The highest count in `dayEventCounts`
- `currentDayEventCount`: The count for the currently selected `filterDay`

#### Modified `filteredRows` logic
Currently (line 310): `if (filterDay) rows = rows.filter(a => a.eventDay === filterDay);`

Updated logic:
- If `similarMode` is ON and `filterDay` is set: filter to all days where `dayEventCounts.get(day) === currentDayEventCount`, sorted ascending
- If `eventCountFilter` is set: filter to all days where `dayEventCounts.get(day) === eventCountFilter`, sorted ascending  
- Otherwise: keep existing `filterDay` behavior

#### UI — Header controls (after Sort dropdown, before Expand All)
Only render when `filterDay` is active:
```
[Similar] [1] [2] [3] [4] [5]
```
- "Similar" is a toggle button (highlighted when active)
- Number pills are styled like the lagan day pills, highlighted when selected
- Reset both when `filterDay` is cleared

#### Cleanup
- When `filterDay` changes to null, reset `similarMode` and `eventCountFilter`

### Files Changed
- **`src/components/suite/AllClientsCrewTable.tsx`** — add state, computed values, modify filteredRows, add UI controls

