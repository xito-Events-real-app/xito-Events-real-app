

# Plan: Tabbed View for Upcoming Events and Handler Activity

## Overview

Transform the current stacked layout of Upcoming Events + Handler Activity Grid into a **tabbed interface** with 4 tabs:
1. **Upcoming Events** - Shows the existing TodayEventsHero content
2. **Benzo** - Shows Benzo's handler activity + star clients
3. **Barun** - Shows Barun's handler activity + star clients  
4. **Nikit** - Shows Nikit's handler activity + star clients

This makes it easier to focus on one section at a time and navigate between handlers quickly.

---

## Visual Layout

```text
+--------------------------------------------------+
|  [ Upcoming Events ]  [ Benzo ]  [ Barun ]  [ Nikit ]  |  ← Tab Bar
+--------------------------------------------------+
|                                                  |
|  TAB CONTENT AREA                                |
|                                                  |
|  (Shows content based on selected tab)           |
|                                                  |
+--------------------------------------------------+
```

### Tab Design
- **Upcoming Events Tab**: Emerald/teal color with Calendar icon
- **Benzo Tab**: Violet color with User icon
- **Barun Tab**: Emerald color with User icon
- **Nikit Tab**: Blue color with User icon

Each handler tab shows:
- Handler Activity Section (Today + Yesterday activities)
- Handler Star Clients section below

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/suite/SuiteDashboardContent.tsx` | UPDATE | Replace stacked layout with tabbed interface |
| `src/components/suite/MobileSuiteLanding.tsx` | UPDATE | Update HomeTabContent to use new tabbed component |

---

## Implementation Details

### 1. Update SuiteDashboardContent

Replace the current layout:
```tsx
<TodayEventsHero />
<HandlerActivityGrid />
```

With a new tabbed interface using shadcn Tabs:

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, User } from "lucide-react";

const HANDLERS = [
  { name: 'Benzo', colorScheme: 'violet' as const },
  { name: 'Barun', colorScheme: 'emerald' as const },
  { name: 'Nikit', colorScheme: 'blue' as const },
];

<Tabs defaultValue="events" className="w-full">
  <TabsList className="grid grid-cols-4 w-full mb-4">
    <TabsTrigger value="events" className="gap-1">
      <Calendar className="w-4 h-4" />
      <span className="hidden sm:inline">Events</span>
    </TabsTrigger>
    {HANDLERS.map(h => (
      <TabsTrigger key={h.name} value={h.name.toLowerCase()} className="gap-1">
        <User className="w-4 h-4" />
        {h.name}
      </TabsTrigger>
    ))}
  </TabsList>
  
  <TabsContent value="events">
    <TodayEventsHero />
  </TabsContent>
  
  {HANDLERS.map(h => (
    <TabsContent key={h.name} value={h.name.toLowerCase()}>
      <HandlerActivitySection handlerName={h.name} colorScheme={h.colorScheme} />
      <HandlerStarClients handlerName={h.name} colorScheme={h.colorScheme} />
    </TabsContent>
  ))}
</Tabs>
```

### 2. Tab Styling

Each tab will have:
- Active state with colored background
- Icon + text (text hidden on very small screens)
- Smooth transitions
- Handler-specific colors when active:
  - Events: Emerald
  - Benzo: Violet
  - Barun: Emerald
  - Nikit: Blue

### 3. Update Mobile HomeTabContent

The mobile view will also use this new tabbed component for consistency.

---

## Component Structure

```text
SuiteDashboardContent / HomeTabContent
└── Tabs
    ├── TabsList (4 tabs horizontally)
    │   ├── "Upcoming Events" (emerald)
    │   ├── "Benzo" (violet)
    │   ├── "Barun" (emerald)
    │   └── "Nikit" (blue)
    │
    └── TabsContent
        ├── [events] → TodayEventsHero
        ├── [benzo] → HandlerActivitySection + HandlerStarClients
        ├── [barun] → HandlerActivitySection + HandlerStarClients
        └── [nikit] → HandlerActivitySection + HandlerStarClients
```

---

## Benefits

1. **Cleaner View**: Only one section visible at a time
2. **Quick Navigation**: Easy to switch between handlers
3. **Focused Content**: Each handler's activity gets full screen space
4. **Consistent Experience**: Same behavior on mobile and desktop
5. **Better UX**: Clicking on a tab immediately shows relevant content

---

## Expected Result

### Before
- Upcoming Events stacked above
- All 3 handlers shown in a grid (cramped on mobile)
- Need to scroll to see all handlers

### After
- Clean tab bar at the top
- Click "Upcoming Events" to see scheduled events
- Click "Benzo" to see only Benzo's activity + star clients
- Click "Barun" to see only Barun's activity + star clients
- Click "Nikit" to see only Nikit's activity + star clients
- Full width content for each tab

