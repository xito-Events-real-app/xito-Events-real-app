

# Plan: Handler Activity Sections for Xito Business Suite

## Overview

Add a new "Handler Activity" section above the "Coming Soon" section that displays three individual handler feeds for **Benzo**, **Barun**, and **Nikit**. Each handler section will show their recent client interactions (comments, new clients, status changes, etc.) grouped by TODAY and YESTERDAY, sourced from the same Column AJ data used by Breaking News.

---

## UI Preview

```text
┌─────────────────────────────────────────────────┐
│  Quick Add Buttons                               │
│  Master Sync                                     │
│  Master Search                                   │
│  Today's Events                                  │
├─────────────────────────────────────────────────┤
│  ACTIVE MODULES                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Clients  │ │  Booked  │ │ Finance  │         │
│  └──────────┘ └──────────┘ └──────────┘         │
├─────────────────────────────────────────────────┤
│  HANDLER ACTIVITY              [NEW SECTION]     │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  🟣 BENZO                                 │  │
│  │  ───────────────────────────────────────  │  │
│  │  TODAY                                    │  │
│  │  • New client: John Doe        10m ago   │  │
│  │  • Comment added: Jane Smith   2h ago    │  │
│  │  ───────────────────────────────────────  │  │
│  │  YESTERDAY                                │  │
│  │  • Status → Quotation Sent     1d ago    │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  🟢 BARUN                                 │  │
│  │  ───────────────────────────────────────  │  │
│  │  TODAY                                    │  │
│  │  • Payment received: ...        1h ago   │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │  🔵 NIKIT                                 │  │
│  │  ───────────────────────────────────────  │  │
│  │  No recent activity                       │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
├─────────────────────────────────────────────────┤
│  🚧 COMING SOON                                  │
│  ...                                             │
└─────────────────────────────────────────────────┘
```

---

## Requirements Summary

| Requirement | Implementation |
|-------------|----------------|
| Location | Below Active Modules, Above Coming Soon |
| Handlers | Benzo, Barun, Nikit (hardcoded for now) |
| Data Source | Column AJ (lastActivityLog) - same as Breaking News |
| Grouping | TODAY and YESTERDAY sections per handler |
| Activity Types | New client, comments, status changes, payments, calls |
| Click Action | Navigate to client detail page |

---

## Technical Implementation

### File 1: NEW - `src/components/suite/HandlerActivitySection.tsx`

A collapsible section for a single handler showing their activities grouped by day.

**Props:**
- `handlerName: string` - The handler's name (e.g., "Benzo")
- `activities: ActivityItem[]` - Pre-filtered activities for this handler
- `color: { bg: string; text: string; border: string }` - Handler's accent color

**Features:**
- Collapsible card (default expanded)
- TODAY / YESTERDAY sticky headers
- Empty state: "No recent activity"
- Activity cards matching Breaking News style
- Click-through to client detail

---

### File 2: NEW - `src/components/suite/HandlerActivityGrid.tsx`

Container component that renders three handler sections in a grid.

**Structure:**
```tsx
const HANDLERS = [
  { name: 'Benzo', color: 'violet' },
  { name: 'Barun', color: 'emerald' },
  { name: 'Nikit', color: 'blue' },
];

function HandlerActivityGrid() {
  const { activities } = useActivityFeed();
  
  // Filter activities by handler for each section
  const handlerActivities = useMemo(() => {
    return HANDLERS.map(handler => ({
      ...handler,
      activities: activities.filter(a => 
        a.handlerName?.toLowerCase() === handler.name.toLowerCase()
      ),
    }));
  }, [activities]);
  
  return (
    <div className="space-y-4">
      <h3>Handler Activity</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {handlerActivities.map(handler => (
          <HandlerActivitySection
            key={handler.name}
            handlerName={handler.name}
            activities={handler.activities}
            color={handler.color}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### File 3: NEW - `src/hooks/useHandlerActivityFeed.ts`

A specialized hook that filters and groups activities by handler.

**Features:**
- Accepts `handlerName` parameter
- Filters activities where `activity.handlerName === handlerName`
- Groups filtered activities into TODAY and YESTERDAY
- Returns: `{ todayActivities, yesterdayActivities, totalCount }`

**Implementation:**
```typescript
export function useHandlerActivityFeed(handlerName: string) {
  const { activities, isLoading } = useActivityFeed();
  
  const handlerActivities = useMemo(() => {
    return activities.filter(a => 
      a.handlerName?.toLowerCase().trim() === handlerName.toLowerCase().trim()
    );
  }, [activities, handlerName]);
  
  const grouped = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const todayActivities = handlerActivities.filter(a => a.timestamp >= today);
    const yesterdayActivities = handlerActivities.filter(a => 
      a.timestamp >= yesterday && a.timestamp < today
    );
    
    return { todayActivities, yesterdayActivities };
  }, [handlerActivities]);
  
  return {
    todayActivities: grouped.todayActivities,
    yesterdayActivities: grouped.yesterdayActivities,
    totalCount: handlerActivities.length,
    isLoading,
  };
}
```

---

### File 4: UPDATE - `src/components/suite/SuiteHomeContent.tsx`

Add the HandlerActivityGrid between Active Modules and Coming Soon.

**Changes:**
```tsx
{/* Active Modules */}
<div className="space-y-3">
  {activeModules.map((module) => (
    <ModuleCard ... />
  ))}
</div>

{/* NEW: Handler Activity Section */}
<HandlerActivityGrid />

{/* Spacer to push Coming Soon below fold */}
<div className="min-h-[60px]" />

{/* Coming Soon Section */}
...
```

---

### File 5: UPDATE - `src/components/suite/DesktopSuiteLanding.tsx`

Add HandlerActivityGrid in the desktop layout between Active Modules and Coming Soon.

**Changes:**
```tsx
{/* Active Modules */}
<div className="space-y-4">
  <h3>Active Modules</h3>
  <div className="grid grid-cols-3 gap-4">
    {activeModules.map(...)}
  </div>
</div>

{/* NEW: Handler Activity Section */}
<HandlerActivityGrid />

{/* Spacer */}
<div className="min-h-[100px]" />

{/* Coming Soon Modules */}
...
```

---

### File 6: UPDATE - `src/components/suite/index.ts`

Export the new components:
```typescript
export { HandlerActivitySection } from './HandlerActivitySection';
export { HandlerActivityGrid } from './HandlerActivityGrid';
```

---

## Handler Color Scheme

| Handler | Primary Color | Badge BG | Badge Text |
|---------|---------------|----------|------------|
| Benzo | Violet | bg-violet-100 | text-violet-700 |
| Barun | Emerald | bg-emerald-100 | text-emerald-700 |
| Nikit | Blue | bg-blue-100 | text-blue-700 |

---

## Component Detail: HandlerActivitySection

```tsx
function HandlerActivitySection({ handlerName, activities, colorScheme }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { todayActivities, yesterdayActivities } = useHandlerActivityFeed(handlerName);
  
  const colors = {
    violet: { bg: 'bg-violet-500', light: 'bg-violet-100', text: 'text-violet-700' },
    emerald: { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-700' },
    blue: { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700' },
  }[colorScheme];

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div 
        className={cn("p-3 flex items-center justify-between cursor-pointer", colors.light)}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", colors.bg)}>
            <User className="w-4 h-4 text-white" />
          </div>
          <span className={cn("font-bold", colors.text)}>{handlerName}</span>
          {(todayActivities.length > 0 || yesterdayActivities.length > 0) && (
            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
              {todayActivities.length + yesterdayActivities.length}
            </span>
          )}
        </div>
        <ChevronDown className={cn("w-4 h-4 transition-transform", !isExpanded && "-rotate-90")} />
      </div>
      
      {/* Content */}
      {isExpanded && (
        <CardContent className="p-3 space-y-3 max-h-80 overflow-y-auto">
          {/* TODAY Section */}
          {todayActivities.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">Today</h4>
              {todayActivities.slice(0, 5).map(activity => (
                <CompactActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          )}
          
          {/* YESTERDAY Section */}
          {yesterdayActivities.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-500 uppercase">Yesterday</h4>
              {yesterdayActivities.slice(0, 5).map(activity => (
                <CompactActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          )}
          
          {/* Empty State */}
          {todayActivities.length === 0 && yesterdayActivities.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">
              No recent activity
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
```

---

## Data Flow Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│  Column AJ (lastActivityLog) in Google Sheets               │
│  Format: "MM/DD/YYYY HH:MM:SS | ACTIVITY_TYPE | Details"    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  parseActivityLogColumn() in activity-utils.ts               │
│  - Extracts handler from client.clientHandler (Column X)    │
│  - Returns ActivityItem[] with handlerName field            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  useActivityFeed() hook                                      │
│  - Merges CLIENT TRACKER + BOOKED CLIENTS                    │
│  - Returns all activities with handler names                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
           ┌────────────────┼────────────────┐
           │                │                │
           ▼                ▼                ▼
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │  Benzo    │    │  Barun    │    │  Nikit    │
    │ Filter:   │    │ Filter:   │    │ Filter:   │
    │ handler   │    │ handler   │    │ handler   │
    │ === name  │    │ === name  │    │ === name  │
    └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
          │                │                │
          ▼                ▼                ▼
    ┌───────────┐    ┌───────────┐    ┌───────────┐
    │ Handler   │    │ Handler   │    │ Handler   │
    │ Activity  │    │ Activity  │    │ Activity  │
    │ Section   │    │ Section   │    │ Section   │
    └───────────┘    └───────────┘    └───────────┘
```

---

## Summary of Files to Create/Modify

| File | Action |
|------|--------|
| `src/hooks/useHandlerActivityFeed.ts` | CREATE - Hook for handler-specific activities |
| `src/components/suite/HandlerActivitySection.tsx` | CREATE - Single handler activity card |
| `src/components/suite/HandlerActivityGrid.tsx` | CREATE - Grid of 3 handler sections |
| `src/components/suite/SuiteHomeContent.tsx` | UPDATE - Add HandlerActivityGrid |
| `src/components/suite/DesktopSuiteLanding.tsx` | UPDATE - Add HandlerActivityGrid |
| `src/components/suite/index.ts` | UPDATE - Export new components |

---

## Mobile vs Desktop Layout

| Layout | Handler Grid |
|--------|--------------|
| Mobile | Single column, stacked vertically |
| Desktop | 3 columns side by side |

---

## Expected Result

1. Below Active Modules, three collapsible handler cards appear
2. Each card shows the handler's name with a colored avatar
3. Activities are grouped into TODAY and YESTERDAY sections
4. Up to 5 activities shown per section (most recent first)
5. Clicking an activity navigates to the client detail page
6. Empty handlers show "No recent activity" message
7. Cards are collapsible to save space

