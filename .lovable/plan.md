

## Add "Sort By" Dropdown to All Clients Crew Table Header

### Overview
Add a "Sort By" dropdown next to the "Expand All" button with 7 sorting modes that reorder and group the table rows differently.

### Sort Modes

1. **Default** — Current behavior (by day ascending)
2. **Maximum Events** — Group by date, dates with most events first. Thick border between date groups.
3. **Minimum Events** — Group by date, dates with fewest events first. Same thick borders.
4. **Drone** — Filter to only rows where `droneOperator` is assigned, sorted ascending by day.
5. **Freelancer Maximum** — Group rows by freelancer name (across all crew columns), freelancers with most events first. Each group gets a header card showing: Name, Total Events (this month), Last Month Events, Next Month Events, All-Time Events. Rows start collapsed, expandable per freelancer.
6. **Freelancer Minimum** — Same as above but freelancers with fewest events first.
7. **Unassigned First** — Rows with the most empty required slots appear first (helps prioritize incomplete assignments).

### Technical Approach

**File: `src/components/suite/AllClientsCrewTable.tsx`**

#### State
```typescript
const [sortMode, setSortMode] = useState<'default' | 'maxEvents' | 'minEvents' | 'drone' | 'freelancerMax' | 'freelancerMin' | 'unassignedFirst'>('default');
```

#### Sorted/Grouped Rows Logic
- Wrap existing `filteredRows` with a `sortedRows` memo that applies the active sort
- For "Maximum/Minimum Events": count events per `eventDay`, then sort days by count desc/asc, maintain day grouping
- For "Drone": filter `filteredRows` to only rows with `droneOperator` non-empty
- For "Freelancer Max/Min": extract all unique freelancer names from all crew columns across `filteredRows`, count appearances, sort desc/asc. Build a `Map<freelancerName, FreelancerAssignment[]>` structure
- For "Unassigned First": count empty required slots per row, sort descending

#### Freelancer Group Headers
When `sortMode` is `freelancerMax` or `freelancerMin`, render a different layout:
- For each freelancer group, show a collapsible header card with:
  - **Name** (bold)
  - **This Month**: count from current filteredRows
  - **Last Month**: count from `assignments` where year/month is previous
  - **Next Month**: count from `assignments` where year/month is next
  - **All-Time**: count from full `assignments` array
- Rows under each header start collapsed (separate expand state per freelancer group)

#### UI — Header Button
Add a `Select` dropdown after the "Expand All" button:
```
[Sort By ▾]  →  Default | Max Events | Min Events | Drone | Freelancer Max | Freelancer Min | Unassigned First
```

#### Date Group Borders
For Max/Min Events sort modes, add a `border-b-4 border-violet-400` between date groups (using the existing `dayGroups` pattern but applying a thicker separator).

### Files Changed
- **`src/components/suite/AllClientsCrewTable.tsx`** — Add sort state, sorted rows logic, freelancer grouping with header cards, dropdown in header bar, thick date borders for event count sorts

