
# Plan: Breaking News Section with Tab Navigation on Xito Business Suite

## Overview

Add a new **"Breaking News"** section to the Xito Business Suite homepage that shows recent activity across the entire system. The page will have a tab-based navigation at the bottom with two sections:
- **HOME** - Current content (modules, quick add, today's events)
- **NEWS** - Activity feed showing all recent actions day-wise

## Activity Types to Track

The news feed will aggregate and display these activities from client data:

| Activity Type | Source Field | How to Detect |
|--------------|--------------|---------------|
| New Client Added | `registeredDateTimeAD` | Parse timestamp from Column A |
| Status Change | `statusLog` | Parse each line with timestamp |
| Comment Added | `comments` | Split by `\|\|\|`, parse timestamps |
| Payment Recorded | `paymentsMade` | Parse payment entries with dates |
| Call Logged | `callLog` | Parse call entries with timestamps |
| Quotation Sent | `quotationData` | When status changes to QUOTATION SENT |
| Client Booked | `statusLog` | When status contains "BOOKED" |
| Form Filled | Client contact form submissions (future enhancement) |

## UI Design

### Bottom Tab Navigation (Mobile)
```text
+------------------------------------------+
|                                          |
|          [ Current Content ]             |
|                                          |
+------------------------------------------+
|   [  HOME  ]         [  NEWS  ]          |   <-- Fixed bottom tabs
+------------------------------------------+
```

### News Tab Content Structure
```text
+------------------------------------------+
|  Breaking News                           |
|  Real-time updates from your business    |
+------------------------------------------+
|  TODAY - Magh 17, 2082                   |
|  ├─ Payment received from Sargat Thapa   |
|  │  NPR 50,000/- as ADVANCE • 2:30 PM    |
|  ├─ New comment on Ram Thapa             |
|  │  "Called, will confirm tomorrow"      |
|  └─ Status changed: Hari Sharma          |
|     QUOTATION SENT → BOOKED • 11:15 AM   |
+------------------------------------------+
|  YESTERDAY - Magh 16, 2082               |
|  ├─ New client added: Shyam Bahadur      |
|  │  Source: Instagram • 5:45 PM          |
|  └─ Call logged: Gopal Thapa             |
|     2nd DIRECT CALL • 3:20 PM            |
+------------------------------------------+
|  Magh 15, 2082                           |
|  └─ ...more activities...                |
+------------------------------------------+
```

### Activity Card Designs

Each activity will be a compact card with:
- **Icon** - Colored by activity type (payment=green, comment=blue, status=purple, etc.)
- **Client name** - Clickable link to client detail page
- **Activity details** - What happened
- **Timestamp** - Relative time (2 hours ago) or absolute if older

### Color Scheme by Activity Type
- **Payment**: Emerald/Green gradient
- **Comment**: Blue
- **Status Change**: Purple
- **New Client**: Violet
- **Call Logged**: Amber
- **Booking**: Teal

## Technical Implementation

### 1. Create Activity Parsing Utility

**New file:** `src/lib/activity-utils.ts`

```typescript
export interface ActivityItem {
  id: string;
  type: 'payment' | 'comment' | 'status' | 'client_added' | 'call' | 'booking';
  clientName: string;
  clientId: string;  // registeredDateTimeAD for navigation
  description: string;
  details?: string;
  timestamp: Date;
  dateBS?: string;
  icon: string;
  color: string;
}

// Parse all activities from client data
export function parseActivities(
  clients: ClientData[], 
  bookedClients: BookedClientData[]
): ActivityItem[];

// Group activities by day
export function groupActivitiesByDay(
  activities: ActivityItem[]
): Map<string, ActivityItem[]>;
```

### 2. Create News Tab Component

**New file:** `src/components/suite/SuiteNewsFeed.tsx`

- Displays activities grouped by day
- Scrollable list with pull-to-refresh
- Each activity card links to client detail page
- Uses existing parsing utilities from `client-card-utils.ts`

### 3. Create Activity Card Component

**New file:** `src/components/suite/ActivityCard.tsx`

- Compact card design matching existing UI
- Icon + client name + description + timestamp
- Click navigates to client detail

### 4. Update MobileSuiteLanding with Tabs

**File:** `src/components/suite/MobileSuiteLanding.tsx`

Replace the current full-page layout with a tabbed interface:

```typescript
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function MobileSuiteLanding() {
  const [activeTab, setActiveTab] = useState<'home' | 'news'>('home');
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header - stays fixed */}
      <Header />
      
      {/* Tab Content - scrollable */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'home' && <HomeContent />}
        {activeTab === 'news' && <SuiteNewsFeed />}
      </div>
      
      {/* Bottom Tab Navigation - fixed */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-bottom z-50">
        <div className="flex items-center justify-center gap-4 py-2">
          <TabButton 
            icon={Home} 
            label="Home" 
            active={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
          />
          <TabButton 
            icon={Newspaper} 
            label="News" 
            active={activeTab === 'news'}
            onClick={() => setActiveTab('news')}
            badge={newActivitiesCount}  // Optional: unread count
          />
        </div>
      </div>
    </div>
  );
}
```

### 5. Create Custom Hook for Activities

**New file:** `src/hooks/useActivityFeed.ts`

```typescript
export function useActivityFeed() {
  const { clients } = useCachedData();
  const { clients: bookedClients } = useBookedCachedData();
  
  const activities = useMemo(() => {
    return parseActivities(clients, bookedClients);
  }, [clients, bookedClients]);
  
  const groupedByDay = useMemo(() => {
    return groupActivitiesByDay(activities);
  }, [activities]);
  
  return { activities, groupedByDay, isLoading };
}
```

### 6. Update Desktop Suite Landing

**File:** `src/components/suite/DesktopSuiteLanding.tsx`

Add a sidebar panel or dedicated section for news feed on desktop view.

## File Structure

```text
src/
├── lib/
│   └── activity-utils.ts          # NEW - Activity parsing logic
├── hooks/
│   └── useActivityFeed.ts         # NEW - Hook for activity data
├── components/
│   └── suite/
│       ├── MobileSuiteLanding.tsx # MODIFY - Add tabs
│       ├── DesktopSuiteLanding.tsx# MODIFY - Add news panel
│       ├── SuiteNewsFeed.tsx      # NEW - News feed component
│       ├── ActivityCard.tsx       # NEW - Individual activity card
│       ├── SuiteHomeContent.tsx   # NEW - Extracted home content
│       └── index.ts               # MODIFY - Export new components
```

## Files to Create

| File | Purpose |
|------|---------|
| `src/lib/activity-utils.ts` | Parse activities from client data, group by day |
| `src/hooks/useActivityFeed.ts` | Custom hook to fetch and process activities |
| `src/components/suite/SuiteNewsFeed.tsx` | Main news feed component with day groupings |
| `src/components/suite/ActivityCard.tsx` | Individual activity card component |
| `src/components/suite/SuiteHomeContent.tsx` | Extracted current home content for tab |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/suite/MobileSuiteLanding.tsx` | Add bottom tab navigation, refactor to use tabs |
| `src/components/suite/DesktopSuiteLanding.tsx` | Add news panel/sidebar |
| `src/components/suite/index.ts` | Export new components |

## Activity Parsing Logic

### From StatusLog (Column W)
```text
"JUST ENQUIRED - 01/30/2026, 10:15:00
QUOTATION SENT : REVIEW PENDING - 01/30/2026, 14:30:00
BOOKED - 01/31/2026, 09:00:00"
```
Each line = 1 status change activity

### From Comments (Column AC)
```text
"Called back, interested|||[01/30/2026 15:30]Will send quotation tomorrow|||[01/31/2026 10:00]"
```
Each `|||` segment = 1 comment activity

### From PaymentsMade (Column AE)
```text
"NPR 50,000/- AS ADVANCE ON SAT 2082-10-16 IN ESEWA
NPR 25,000/- AS PARTIAL ON SUN 2082-10-17 IN CASH"
```
Each line = 1 payment activity

### From CallLog (Column Y)
```text
"1ST DIRECT CALL AT 3:45 PM ON 2025-01-18
2ND WHATSAPP CALL AT 10:30 AM ON 2025-01-19"
```
Each line = 1 call logged activity

## Expected User Flow

1. User opens Xito Business Suite (/)
2. By default, sees **HOME** tab with current content
3. Taps **NEWS** tab at bottom
4. Sees chronological feed of all activities grouped by day
5. Taps on any activity card → navigates to that client's detail page
6. Can scroll through historical activities (last 7-14 days)

## Performance Considerations

- Parse activities only when client data changes (memoized)
- Limit display to last 14 days or 100 activities initially
- Virtual scrolling for long lists (if needed)
- Activities are derived from already-cached data (no extra API calls)

## Future Enhancements

- Push notifications for new activities
- Filter by activity type
- Search within activities
- Mark activities as read
- Real-time updates via Supabase Realtime (if connected)
