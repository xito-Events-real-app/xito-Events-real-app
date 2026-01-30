
# Plan: Add Yellow Visual Indicators for ADVANCE PENDING Clients in Booking Calendar

## Overview

This plan adds yellow visual indicators to the Booking Calendar in both **CLIENT TRACKER** and **BOOKED CLIENTS** pages to highlight dates where clients with "ADVANCE PENDING" status have events planned.

---

## Current Behavior

The booking calendar currently shows:
- **Plain numbers** = Open dates (no bookings)
- **Green filled circles** = BOOKED events (with concentric rings for multiple events)
- **Gray/Muted circles** = Completed (past) events

---

## Requested Behavior

When a date has **ADVANCE PENDING** client events:

| Scenario | Visual |
|----------|--------|
| **No booked events on date** | Yellow text for the day number |
| **Has booked events on date** | Yellow outer ring around the green booked circle |

This creates a visual hierarchy:
1. **Green** = Confirmed booking
2. **Yellow** = Advance pending (almost booked)
3. **Plain text** = Open date

---

## Technical Changes

### 1. Modify Calendar Data Structure

**Files**: 
- `src/components/desktop/DesktopDashboard.tsx`
- `src/components/booked/DesktopBookedDashboard.tsx`

Extend the `calendarData` object to track ADVANCE PENDING events per date:

**Before**:
```typescript
days: { day: number; isBooked: boolean; eventCount: number }[]
```

**After**:
```typescript
days: { 
  day: number; 
  isBooked: boolean; 
  eventCount: number;
  advancePendingCount: number;  // NEW: Count of ADVANCE PENDING events
}[]
```

### 2. Update Calendar Data Computation

**File**: `src/components/desktop/DesktopDashboard.tsx`

```text
Algorithm:
1. Build TWO maps:
   - bookedMap: dateKey → count of BOOKED events
   - advancePendingMap: dateKey → count of ADVANCE PENDING events

2. For each client:
   - Get status from statusLog
   - If status includes "ADVANCE PENDING":
     → Add events to advancePendingMap
   - If status includes "BOOKED" (not SOMEWHERE ELSE):
     → Add events to bookedMap

3. For each calendar day:
   - isBooked = bookedMap.get(dateKey) > 0
   - eventCount = bookedMap.get(dateKey) || 0
   - advancePendingCount = advancePendingMap.get(dateKey) || 0
```

### 3. Update Calendar Rendering

**File**: `src/components/desktop/DesktopDashboard.tsx` (lines 614-668)

**Scenario 1**: Date has ADVANCE PENDING events but NO booked events
- Render day number in **yellow/amber text** instead of plain muted text
- Add subtle yellow background on hover

**Scenario 2**: Date has BOTH booked AND advance pending events  
- Render the normal green circles for booked events
- Add an **additional outer yellow ring** around the outermost green ring

**Scenario 3**: Date has only booked events (no advance pending)
- Keep current green circle rendering (no change)

**Scenario 4**: Date has no events at all
- Keep current plain text rendering (no change)

### 4. Apply Same Logic to Booked Clients Dashboard

**File**: `src/components/booked/DesktopBookedDashboard.tsx` (lines 271-327, 583-648)

Since the Booked Clients page only shows BOOKED clients (not ADVANCE PENDING clients), we need to pass the ADVANCE PENDING data from the full client list via props, OR fetch it separately.

**Approach**: The Booked Clients dashboard should receive an additional prop `trackerClients` that includes all CLIENT TRACKER clients with ADVANCE PENDING status, so it can overlay the yellow indicators.

---

## Visual Design

### Yellow Styling Classes

```text
Yellow Text (no booking on date):
  - text-amber-500 (light mode)
  - dark:text-yellow-400 (dark mode)
  - bg-amber-500/10 on hover

Yellow Outer Ring (has booking + advance pending):
  - border-amber-500 (2px border)
  - Positioned as outermost ring
  - Size = largest green ring + 8px
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/desktop/DesktopDashboard.tsx` | Add `advancePendingMap`, update `calendarData` structure, update calendar day rendering logic |
| `src/components/booked/DesktopBookedDashboard.tsx` | Add props for tracker clients, update `calendarData` to include ADVANCE PENDING from tracker, update rendering |
| `src/components/booked/DesktopBookedAppLayout.tsx` | Pass tracker clients data to dashboard component |

---

## Data Flow

```text
                    CLIENT TRACKER PAGE
                    ┌─────────────────────┐
                    │  All Clients Data   │
                    │  (includes ADVANCE  │
                    │   PENDING clients)  │
                    └─────────┬───────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   calendarData      │
                    │ - bookedMap         │
                    │ - advancePendingMap │
                    └─────────┬───────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │   Calendar UI       │
                    │ - Green = Booked    │
                    │ - Yellow = Advance  │
                    └─────────────────────┘


                    BOOKED CLIENTS PAGE
                    ┌─────────────────────┐
                    │  Booked Clients     │─────┐
                    │  (BOOKED only)      │     │
                    └─────────────────────┘     │
                              +                 │
                    ┌─────────────────────┐     │
                    │  Tracker Clients    │     │
                    │  (ADVANCE PENDING)  │─────┼──▶ calendarData
                    │  (passed as prop)   │     │
                    └─────────────────────┘     │
                                                ▼
                                   ┌─────────────────────┐
                                   │   Calendar UI       │
                                   │ - Green = Booked    │
                                   │ - Yellow = Advance  │
                                   └─────────────────────┘
```

---

## Legend Update

Update the calendar header legend in both dashboards:

**Before**:
```text
(Plain = Open, ● = Booked)
```

**After**:
```text
(Plain = Open, 🟢 = Booked, 🟡 = Advance Pending)
```

---

## Expected Visual Result

```text
Calendar Row Example:
┌──────────────────────────────────────────────────────────────────┐
│ Magh 2082:  1  2  🟢3  4  5  🟡6  7  🟢🟡8  9  10  11  🟢12  ... │
└──────────────────────────────────────────────────────────────────┘

Where:
- "3" is a green circle (1 booked event)
- "6" is yellow text (1 advance pending, 0 booked)
- "8" is a green circle with yellow outer ring (1 booked + 1 advance pending)
- "12" is a green circle (1 booked event)
```
