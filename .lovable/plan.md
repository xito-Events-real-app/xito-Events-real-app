
## Add "DATE WISE" View to Booked Clients Dashboard

### Overview
Add a new "DATE WISE" view as the default section in the Booked Clients module. This view displays events sorted by date in ascending order (earliest first), with completed events at the end.

---

### Current Structure
The dashboard currently has a toggle between:
- **Hot Dates** - Date cards grouped by date (popularity sorted by default)
- **CLIENT WISE** - Client cards with their events

### New Structure
Three view modes with tabs:
1. **DATE WISE** (default) - Events listed chronologically, ascending order, completed last
2. **HOT DATES** - Date cards grouped by date
3. **CLIENT WISE** - Client cards with their events

---

### Changes

#### File 1: `src/components/booked/DesktopBookedDashboard.tsx`

**Change 1: Replace `showClientWise` boolean with a view mode state**

| Line | Current | New |
|------|---------|-----|
| 85 | `const [showClientWise, setShowClientWise] = useState(false);` | `const [viewMode, setViewMode] = useState<'datewise' \| 'hotdates' \| 'clientwise'>('datewise');` |

**Change 2: Update the view toggle buttons in the Hot Dates header (lines 759-778)**

Replace the single CLIENT WISE toggle button with three toggle buttons:
```tsx
<div className="flex items-center gap-2">
  {/* View Mode Toggle Buttons */}
  <div className="flex rounded-lg border overflow-hidden">
    <Button
      variant={viewMode === 'datewise' ? "default" : "ghost"}
      size="sm"
      onClick={() => setViewMode('datewise')}
      className={cn(
        "text-xs h-7 rounded-none",
        viewMode === 'datewise' && "bg-orange-600 hover:bg-orange-700"
      )}
    >
      <CalendarDays className="w-3 h-3 mr-1" />
      DATE WISE
    </Button>
    <Button
      variant={viewMode === 'hotdates' ? "default" : "ghost"}
      size="sm"
      onClick={() => setViewMode('hotdates')}
      className={cn(
        "text-xs h-7 rounded-none border-l",
        viewMode === 'hotdates' && "bg-green-600 hover:bg-green-700"
      )}
    >
      <Flame className="w-3 h-3 mr-1" />
      HOT DATES
    </Button>
    <Button
      variant={viewMode === 'clientwise' ? "default" : "ghost"}
      size="sm"
      onClick={() => setViewMode('clientwise')}
      className={cn(
        "text-xs h-7 rounded-none border-l",
        viewMode === 'clientwise' && "bg-blue-600 hover:bg-blue-700"
      )}
    >
      <Users className="w-3 h-3 mr-1" />
      CLIENT WISE
    </Button>
  </div>
  <Badge variant="outline" className="text-xs">
    {viewMode === 'clientwise' 
      ? `${allClients.length} clients` 
      : viewMode === 'datewise'
        ? `${hotDates.length} dates`
        : `Top ${hotDates.length} dates`}
  </Badge>
</div>
```

**Change 3: Add DATE WISE view in CardContent (lines 781-984)**

Update the conditional rendering:
```tsx
{viewMode === 'datewise' ? (
  // DATE WISE View - Ascending date order, completed last
  <div className="space-y-2">
    {hotDates.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-4">
        No event dates found
      </p>
    ) : (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">Date</TableHead>
            <TableHead>Events</TableHead>
            <TableHead className="w-[100px] text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {hotDates.map((dateInfo) => (
            <TableRow 
              key={dateInfo.dateKey}
              className={cn(
                dateInfo.isCompleted && "opacity-50"
              )}
            >
              <TableCell>
                <button
                  onClick={() => onHotDateFilter?.(dateInfo.dateKey)}
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Badge className={cn(
                    "text-white text-xs",
                    dateInfo.isCompleted 
                      ? "bg-muted-foreground" 
                      : "bg-gradient-to-r from-green-500 to-emerald-500"
                  )}>
                    {dateInfo.year} {dateInfo.monthName} {dateInfo.day}
                  </Badge>
                </button>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {dateInfo.events.map((event, i) => (
                    <button
                      key={`${event.clientName}-${i}`}
                      onClick={() => navigate(getClientDetailPath(event), { state: { from: location.pathname } })}
                      className="text-xs border rounded px-2 py-0.5 hover:bg-primary/10 hover:border-primary transition-colors"
                    >
                      <span className="font-medium">{event.eventName}</span>
                      <span className="text-muted-foreground"> • {event.clientName}</span>
                    </button>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {dateInfo.isCompleted ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Done
                  </Badge>
                ) : (
                  <Badge className="bg-green-500 text-white">
                    {dateInfo.events.length} events
                  </Badge>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    )}
  </div>
) : viewMode === 'clientwise' ? (
  // CLIENT WISE View - existing code
  ...
) : (
  // HOT DATES View - existing code
  ...
)}
```

**Change 4: Ensure ascending sort is applied for DATE WISE view**

Since `hotDates` already respects `hotDatesSortOrder` from the sidebar, and the default is 'popularity', we need to ensure DATE WISE always shows ascending order. Add logic to force ascending sort when in 'datewise' mode:

In the `hotDates` useMemo (around line 262), add a check:
```tsx
// Apply sort order - DATE WISE always uses ascending
const effectiveSortOrder = viewMode === 'datewise' ? 'ascending' : hotDatesSortOrder;
```

However, since `viewMode` would need to be available in the useMemo, we'll create a separate sorted list for DATE WISE:

```tsx
// DATE WISE sorted data - always ascending with completed last
const dateWiseSorted = useMemo(() => {
  return [...hotDates].sort((a, b) => {
    // Completed dates go last
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    // Sort by date ascending
    const dateA = `${a.year}-${a.month.padStart(2, '0')}-${a.day.padStart(2, '0')}`;
    const dateB = `${b.year}-${b.month.padStart(2, '0')}-${b.day.padStart(2, '0')}`;
    return dateA.localeCompare(dateB);
  });
}, [hotDates]);
```

Use `dateWiseSorted` in the DATE WISE view instead of `hotDates`.

---

### Summary

| Item | Details |
|------|---------|
| New View | DATE WISE - Table format showing dates in ascending order |
| Default View | DATE WISE (was Hot Dates) |
| Sorting | Ascending by date, completed events at the end |
| UI | Three toggle buttons: DATE WISE, HOT DATES, CLIENT WISE |
| Styling | Orange color for DATE WISE, Green for HOT DATES, Blue for CLIENT WISE |

---

### Technical Notes

- The existing `hotDates` useMemo already groups events by date and marks completed status
- Creating a separate `dateWiseSorted` useMemo ensures DATE WISE always shows ascending order regardless of sidebar sort selection
- The sidebar "Hot Dates Sort" options (Ascending/Descending/Most Events) will only affect the HOT DATES view
- DATE WISE view uses a table format for better readability of chronological data
