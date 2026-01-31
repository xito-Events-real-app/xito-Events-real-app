
# Plan: Differentiate BOOKED from Negative Status Changes (Red Color for Cancellations)

## Problem

Currently the activity feed treats **BOOKED** and **BOOKED SOMEWHERE ELSE** identically (both show as violet 'booking' type). The user wants:

1. **BOOKED** = Positive outcome (keep violet/green)
2. **BOOKED SOMEWHERE ELSE** = Negative outcome (show RED)
3. **CANCELLED / CANCELLED BY CLIENT / CANCELLED BY US** = Negative outcomes (show RED)

---

## Solution

### 1. Add New Activity Type: `lost`

Add a new activity type called `lost` (or `cancelled`) for negative status changes.

**File: `src/lib/activity-utils.ts`**

```typescript
// Update ActivityType
export type ActivityType = 'payment' | 'comment' | 'status' | 'client_added' | 
                           'call' | 'booking' | 'quotation' | 'handler_change' | 
                           'mindset' | 'lost';

// Add color for 'lost' type
case 'lost':
  return { bg: 'bg-red-500/20', text: 'text-red-500', border: 'border-red-500/30' };
```

### 2. Update Parsing Logic to Detect Negative Outcomes

Modify `parseActivityLogColumn()` and `parseStatusActivities()` to detect:
- BOOKED SOMEWHERE ELSE
- CANCELLED BY CLIENT
- CANCELLED BY US  
- CANCELLED

And map them to the `lost` type instead of `status` or `booking`.

**Current Logic (problematic):**
```typescript
const isBooking = activityType.toUpperCase() === 'STATUS_CHANGE' && 
                  details.toUpperCase().includes('BOOKED') && 
                  !details.toUpperCase().includes('SOMEWHERE ELSE');
```

**Updated Logic:**
```typescript
const upperDetails = details.toUpperCase();

// Check for negative outcomes FIRST
const isLost = upperDetails.includes('BOOKED SOMEWHERE ELSE') ||
               upperDetails.includes('CANCELLED BY CLIENT') ||
               upperDetails.includes('CANCELLED BY US') ||
               upperDetails.includes('CANCELLED');

// Then check for positive booking
const isBooking = !isLost && 
                  activityType.toUpperCase() === 'STATUS_CHANGE' && 
                  upperDetails.includes('BOOKED');

// Use appropriate type
type: isLost ? 'lost' : (isBooking ? 'booking' : type)
```

### 3. Add `lost` Icon and Styling

**Files to update:**
- `src/components/suite/ActivityCard.tsx` - Add red card style for `lost`
- `src/components/suite/HandlerActivitySection.tsx` - Add red background for `lost` type

**ActivityCard.tsx:**
```typescript
// Add XCircle icon import
import { XCircle } from "lucide-react";

// Add to iconMap
const iconMap: Record<ActivityType, LucideIcon> = {
  // ... existing
  lost: XCircle,
};

// Add card style
case 'lost':
  return "bg-red-100 border-2 border-red-400 ring-2 ring-red-200";
```

**HandlerActivitySection.tsx:**
```typescript
// Add XCircle import
import { XCircle } from "lucide-react";

// getActivityIconComponent
case 'lost': return XCircle;

// getTypeBg
case 'lost': return 'bg-red-50 border-red-300';
```

---

## Summary of Files to Modify

| File | Changes |
|------|---------|
| `src/lib/activity-utils.ts` | Add `lost` type, color, parsing logic |
| `src/components/suite/ActivityCard.tsx` | Add `lost` icon mapping and red card style |
| `src/components/suite/HandlerActivitySection.tsx` | Add `lost` icon and red background |

---

## Visual Result

| Status | Type | Color |
|--------|------|-------|
| BOOKED | `booking` | Violet |
| BOOKED SOMEWHERE ELSE | `lost` | Red |
| CANCELLED BY CLIENT | `lost` | Red |
| CANCELLED BY US | `lost` | Red |
| CANCELLED | `lost` | Red |
| Other status changes | `status` | Blue |
