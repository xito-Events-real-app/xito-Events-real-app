
# Plan: Add Event Details to Upcoming Events & Fix Scrolling

## Problem Summary

The user wants two fixes for the Xito Business Suite homepage:
1. **Event Details Missing**: The upcoming events cards should show venue/parlour/timing info, not just client name and event name
2. **Scrolling Not Working**: The upcoming events list cannot be scrolled when there are many events

---

## Current Architecture

```text
┌─────────────────────────────────────────┐
│         TodayEventsHero.tsx             │
│  ┌─────────────────────────────────┐    │
│  │  useBookedCachedData()          │    │
│  │  Returns: clientName, eventName,│    │
│  │  eventDateAD, registeredDateTime│    │
│  │                                 │    │
│  │  MISSING: venue, parlour, times │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │  ScrollArea (Radix)             │    │
│  │  class="max-h-[300px]"          │    │
│  │  Issue: Viewport needs explicit │    │
│  │  height for scroll to work      │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

Event logistics (venue, parlour, timing) are stored in a separate sheet (`BOOKED CLIENTS EVENT DETAILS`) and fetched per-client via the `useEventDetails` hook, but this requires a separate API call for each client.

---

## Solution Overview

### 1. Fix Scrolling Issue
- Update the ScrollArea component in TodayEventsHero to ensure the viewport has proper height constraints
- Add `overflow-hidden` to parent containers and explicit height to the viewport

### 2. Add Event Details to Cards
Create a new backend action to batch-fetch event details for multiple clients in one API call, then display venue/parlour/timing info in each event card.

---

## Implementation Steps

### Step 1: Fix ScrollArea Scrolling

**File**: `src/components/suite/TodayEventsHero.tsx`

**Issue**: The Radix ScrollArea viewport needs the container to have explicit `overflow-hidden` and the viewport needs proper sizing.

**Change**:
```tsx
// Before
<ScrollArea className="max-h-[300px] md:max-h-[400px] -mr-4 pr-4">

// After - Add explicit height and ensure overflow is handled
<div className="max-h-[300px] md:max-h-[400px] overflow-hidden">
  <ScrollArea className="h-full">
    <div className="pr-4 space-y-2">
      {/* events */}
    </div>
  </ScrollArea>
</div>
```

### Step 2: Create Batch Event Details API Action

**File**: `supabase/functions/google-sheets/index.ts`

Add a new action `getBulkEventDetails` that:
- Accepts an array of `registeredDateTimeAD` values
- Fetches all event details rows in one API call
- Returns a map keyed by `registeredDateTimeAD`

```typescript
async function getBulkEventDetails(
  accessToken: string, 
  spreadsheetId: string, 
  clientIds: string[]
): Promise<Record<string, EventDetail[]>> {
  // Fetch entire EVENT DETAILS sheet once
  // Filter and parse for requested clientIds
  // Return { [registeredDateTimeAD]: EventDetail[] }
}
```

### Step 3: Create Frontend Hook

**File**: `src/hooks/useBulkEventDetails.ts` (new file)

```typescript
export function useBulkEventDetails(clientIds: string[]) {
  // Calls getBulkEventDetails action
  // Returns { eventDetailsMap, isLoading, error }
}
```

### Step 4: Update TodayEventsHero Component

**File**: `src/components/suite/TodayEventsHero.tsx`

**Changes**:
1. Extract all unique `registeredDateTimeAD` values from upcoming events
2. Call `useBulkEventDetails` with those IDs
3. Match event details to each event card by client ID and event index
4. Display venue, timing, and parlour in a compact format

**Updated Event Card Layout**:
```text
┌─────────────────────────────────────────────────┐
│ [TODAY] Client Name                          → │
│         RECEPTION                               │
│ ┌─────────────────────────────────────────────┐ │
│ │ 📍 PALIFAL RESTAURANT, KRITIPUR            │ │
│ │    10:00 AM - 7:00 PM                       │ │
│ │ 💄 Not set                                   │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### Step 5: Add API Action to sheets-api.ts

**File**: `src/lib/sheets-api.ts`

```typescript
export async function getBulkEventDetails(
  clientIds: string[]
): Promise<Record<string, EventDetail[]>> {
  return callSheetsFunction<Record<string, EventDetail[]>>(
    "getBulkEventDetails", 
    { data: { clientIds } }
  );
}
```

---

## Technical Details

### Event Detail Compact Display Format

```text
Venue: VENUE_NAME, AREA, CITY • START_TIME - END_TIME (GUESTS)
Parlour: PARLOUR_NAME, AREA • START_TIME - END_TIME
```

If no venue/parlour is set, show "Not set" in muted text.

### Scroll Fix Explanation

The Radix ScrollArea requires:
1. The container to have a fixed max-height with `overflow-hidden`
2. The ScrollArea to have `h-full` to fill the container
3. The inner content wrapper to handle spacing (not the ScrollArea itself)

### Performance Consideration

The bulk fetch approach loads all event details for the displayed upcoming events in a single API call rather than N calls (one per client). This is more efficient but may return more data. We'll limit to the first 20-30 upcoming events to keep response size reasonable.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/google-sheets/index.ts` | Add `getBulkEventDetails` action |
| `src/lib/sheets-api.ts` | Add `getBulkEventDetails` function |
| `src/hooks/useBulkEventDetails.ts` | Create new hook |
| `src/components/suite/TodayEventsHero.tsx` | Fix scroll + add event details display |
