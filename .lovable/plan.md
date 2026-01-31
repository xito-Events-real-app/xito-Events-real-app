
# Plan: Add Client Priority Star Rating Feature

## Overview

Add a new "Priority" feature using Column AK in the CLIENT TRACKER sheet. This feature enables:
1. **Star Rating Display** (1-5 stars) globally across all client cards
2. **Star Rating Editor** on the Client Detail page 
3. **Handler Star Clients Section** - A new section below each handler showing their priority clients sorted by rating

---

## Data Flow

```text
Google Sheets (Column AK)
         |
         v
Edge Function (parse row[36])
         |
         v
ClientData Interface (priority field)
         |
         v
Frontend Components
    ├── Client Cards (display stars)
    ├── Client Detail Page (edit stars)
    └── Handler Star Clients Section (sorted list)
```

---

## Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `src/lib/sheets-api.ts` | UPDATE | Add `priority?: string` to ClientData interface |
| `supabase/functions/google-sheets/index.ts` | UPDATE | Add priority (row[36]) to all client mapping functions, add `updateClientPriority` action |
| `src/components/ui/star-rating.tsx` | CREATE | Reusable star rating component |
| `src/components/dashboard/FreshClientCard.tsx` | UPDATE | Display star rating on client cards |
| `src/components/client-detail/ClientHeroSection.tsx` | UPDATE | Add interactive star rating editor |
| `src/pages/ClientDetail.tsx` | UPDATE | Add handlers for priority update |
| `src/components/suite/HandlerStarClients.tsx` | CREATE | New "Star Clients" section component |
| `src/components/suite/HandlerActivityGrid.tsx` | UPDATE | Add HandlerStarClients below each HandlerActivitySection |
| `src/hooks/useHandlerStarClients.ts` | CREATE | Hook to filter and sort star clients by handler |

---

## Implementation Details

### 1. Update ClientData Interface

**File: `src/lib/sheets-api.ts`**

```typescript
export interface ClientData {
  // ... existing fields ...
  lastActivityLog?: string;        // Column AJ
  priority?: string;               // Column AK - Star rating (1-5)
  _source?: 'tracker' | 'booked';
}
```

Add new API function:
```typescript
export async function updateClientPriority(
  rowNumber: number,
  priority: string,
  registeredDateTimeAD?: string
): Promise<{ success: boolean }> {
  return callSheetsFunction<{ success: boolean }>("updateClientPriority", {
    data: { rowNumber, priority, registeredDateTimeAD },
  });
}
```

### 2. Update Edge Function

**File: `supabase/functions/google-sheets/index.ts`**

Changes needed:
- Extend data range from `A2:AJ2000` to `A2:AK2000` in all getClients/getAllClients/getSingleClient functions
- Add `priority: row[36] || ''` to all client mapping functions
- Add new action handler `updateClientPriority` to write to Column AK

```typescript
case 'updateClientPriority': {
  const { rowNumber, priority, registeredDateTimeAD } = request.data || {};
  // Find correct row using registeredDateTimeAD (intelligent routing)
  // Write priority value to Column AK
}
```

### 3. Create Star Rating Component

**File: `src/components/ui/star-rating.tsx`**

```tsx
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;           // 0-5
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StarRating({ value, onChange, readonly = true, size = 'sm' }: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };
  
  return (
    <div className="flex items-center gap-0.5">
      {stars.map((star) => (
        <button
          key={star}
          disabled={readonly}
          onClick={() => onChange?.(star === value ? 0 : star)}
          className={cn(
            "transition-colors",
            readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              star <= value 
                ? "fill-amber-400 text-amber-400" 
                : "fill-transparent text-gray-300"
            )}
          />
        </button>
      ))}
    </div>
  );
}
```

### 4. Display Stars on Client Cards

**File: `src/components/dashboard/FreshClientCard.tsx`**

Add star display next to client name:
```tsx
import { StarRating } from "@/components/ui/star-rating";

// In the card header section, after client name:
{parseInt(client.priority || '0') > 0 && (
  <StarRating value={parseInt(client.priority || '0')} readonly size="sm" />
)}
```

### 5. Add Star Rating Editor to Client Detail

**File: `src/components/client-detail/ClientHeroSection.tsx`**

Add interactive star rating next to client name or in the hero section:

```tsx
import { StarRating } from "@/components/ui/star-rating";

// Props addition:
interface ClientHeroSectionProps {
  // ... existing props
  onPriorityChange?: (priority: number) => Promise<void>;
  isUpdatingPriority?: boolean;
}

// In the component, near the client name:
<div className="flex items-center gap-2">
  <h1 className={`...`}>{client.clientName}</h1>
  <StarRating 
    value={parseInt(client.priority || '0')} 
    onChange={onPriorityChange}
    readonly={isUpdatingPriority}
    size="md"
  />
</div>
```

### 6. Create Handler Star Clients Hook

**File: `src/hooks/useHandlerStarClients.ts`**

```typescript
import { useMemo } from "react";
import { useCachedData } from "./useCachedData";
import { ClientData, getCurrentStatus } from "@/lib/sheets-api";

export function useHandlerStarClients(handlerName: string) {
  const { clients, isLoading } = useCachedData();
  
  const starClients = useMemo(() => {
    return clients
      .filter(c => {
        const handler = c.clientHandler?.toLowerCase().trim();
        const priority = parseInt(c.priority || '0');
        const status = getCurrentStatus(c.statusLog || '');
        // Only include clients with priority set and not cancelled
        return handler === handlerName.toLowerCase().trim() 
          && priority > 0
          && !status.toUpperCase().includes('CANCELLED')
          && !status.toUpperCase().includes('BOOKED SOMEWHERE');
      })
      .sort((a, b) => {
        // Sort by priority descending (5 star first)
        return parseInt(b.priority || '0') - parseInt(a.priority || '0');
      })
      .slice(0, 10); // Limit to top 10
  }, [clients, handlerName]);
  
  return { starClients, isLoading };
}
```

### 7. Create Handler Star Clients Component

**File: `src/components/suite/HandlerStarClients.tsx`**

```tsx
import { Star, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";
import { useHandlerStarClients } from "@/hooks/useHandlerStarClients";
import { useNavigate } from "react-router-dom";
import { getClientDetailPath } from "@/lib/client-navigation";
import { getCurrentStatus } from "@/lib/sheets-api";
import { cn } from "@/lib/utils";

interface HandlerStarClientsProps {
  handlerName: string;
  colorScheme: 'violet' | 'emerald' | 'blue';
}

export function HandlerStarClients({ handlerName, colorScheme }: HandlerStarClientsProps) {
  const { starClients, isLoading } = useHandlerStarClients(handlerName);
  const navigate = useNavigate();
  
  if (isLoading) return null;
  if (starClients.length === 0) return null;
  
  return (
    <Card className="mt-2 border-amber-200 bg-amber-50/50">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
          <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wide">
            {handlerName}'s Star Clients
          </h4>
        </div>
        
        <div className="space-y-2">
          {starClients.map(client => (
            <ClientStarCard 
              key={client.registeredDateTimeAD} 
              client={client} 
              onClick={() => navigate(getClientDetailPath(client))}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ClientStarCard({ client, onClick }) {
  const status = getCurrentStatus(client.statusLog || '');
  const priority = parseInt(client.priority || '0');
  
  return (
    <div 
      onClick={onClick}
      className="p-2 bg-white rounded-lg border border-amber-100 cursor-pointer 
                 hover:border-amber-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-800 truncate">
              {client.clientName}
            </p>
            <StarRating value={priority} readonly size="sm" />
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>{client.eventMonth} {client.eventYear}</span>
          </div>
        </div>
        <Badge className="text-[10px] bg-gray-100 text-gray-600 shrink-0">
          {status}
        </Badge>
      </div>
    </div>
  );
}
```

### 8. Update Handler Activity Grid

**File: `src/components/suite/HandlerActivityGrid.tsx`**

Add the HandlerStarClients component below each HandlerActivitySection:

```tsx
import { HandlerStarClients } from "./HandlerStarClients";

// In the render, after each HandlerActivitySection:
{HANDLERS.map(handler => (
  <div key={handler.name} className="space-y-0">
    <HandlerActivitySection
      handlerName={handler.name}
      colorScheme={handler.colorScheme}
    />
    <HandlerStarClients 
      handlerName={handler.name}
      colorScheme={handler.colorScheme}
    />
  </div>
))}
```

### 9. Update Client Detail Page

**File: `src/pages/ClientDetail.tsx`**

Add priority state and handler:

```tsx
const [currentPriority, setCurrentPriority] = useState(client?.priority || '');
const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);

const handlePriorityChange = async (priority: number) => {
  if (!client?.rowNumber) return;
  
  setIsUpdatingPriority(true);
  try {
    await updateClientPriority(
      client.rowNumber, 
      priority.toString(),
      client.registeredDateTimeAD
    );
    setCurrentPriority(priority.toString());
    
    if (updateClientCache) {
      updateClientCache({ ...client, priority: priority.toString() });
    }
    
    toast({ title: "Success", description: `Priority set to ${priority} stars` });
  } catch (err) {
    toast({ title: "Error", description: "Failed to update priority", variant: "destructive" });
  } finally {
    setIsUpdatingPriority(false);
  }
};
```

---

## Visual Layout

**Handler Activity Grid (Mobile):**
```
┌─────────────────────────────────┐
│ 👤 BENZO               [3]  🔄 │ ← Handler Activity Section
├─────────────────────────────────┤
│ TODAY (2)                       │
│ ┌───────────────────────────┐   │
│ │ Client X | Status change  │   │
│ └───────────────────────────┘   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ ⭐ BENZO'S STAR CLIENTS         │ ← NEW Star Clients Section
├─────────────────────────────────┤
│ Client A ⭐⭐⭐⭐⭐  QUOTATION SENT │
│ Client B ⭐⭐⭐⭐    BARGAINING    │
│ Client C ⭐⭐⭐      ADVANCE PEND  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 👤 BARUN               [5]  🔄 │
...
```

**Client Detail Hero (with Star Editor):**
```
┌─────────────────────────────────────┐
│ CLIENT NAME  ⭐⭐⭐⭐☆  [BOOKED] 🔄✏️ │
│ Contact | WhatsApp | Email | City   │
│ Added: XYZ  Handler: ABC            │
└─────────────────────────────────────┘
```

---

## Expected Result

1. **Column AK (PRIORITY)** values (1-5 or empty) will be read and displayed as star ratings
2. **Client Cards** will show a compact star rating next to the client name for prioritized clients
3. **Client Detail Page** will have an interactive star rating editor in the hero section
4. **Handler sections** will show a "Star Clients" subsection with clients sorted by priority (5-star first)
5. Clicking a star client card navigates to their detail page

