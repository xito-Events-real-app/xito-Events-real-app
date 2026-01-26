

# Plan: Add Calendar Date Picker with AD/BS Toggle for Payments

## Overview

Implement a calendar-based date picker for payment dates that supports both AD (English) and BS (Nepali) calendar modes. This will replace the current dropdown-based date selection in:
1. **PaymentDrawer** (Finance module - adding new payments)
2. **PaymentDrawer** (Booked module - adding new payments)
3. **PaymentHistorySheet** (Edit Payment dialog - editing existing payments)

The calendar will default to **AD mode** with a toggle to switch to BS mode.

---

## Visual Design

```text
┌──────────────────────────────────────────────────────┐
│  Payment Date                   [ AD ] [ BS ]        │
├──────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐ │
│  │  < January 2026 >                               │ │
│  │  ─────────────────────────────────────────────  │ │
│  │  Sun  Mon  Tue  Wed  Thu  Fri  Sat              │ │
│  │                   1    2    3    4              │ │
│  │   5    6    7    8    9   10   11              │ │
│  │  12   13   14   15   16   17   18              │ │
│  │  19   20   21  [22]  23   24   25              │ │
│  │  26   27   28   29   30   31                   │ │
│  └─────────────────────────────────────────────────┘ │
│  Selected: Jan 22, 2026 (2082 Magh 9)               │
└──────────────────────────────────────────────────────┘
```

**Key Features:**
- Toggle switch for AD/BS mode (AD is default)
- Full calendar grid (not dropdowns)
- Shows converted date in the other format below selection
- Dark theme styling matching Finance Manager

---

## Technical Implementation

### 1. Create Reusable Payment Date Picker Component

**New File:** `src/components/finance/PaymentDatePicker.tsx`

This component will:
- Accept `dateMode` prop (`'ad'` | `'bs'`) with default `'ad'`
- Include toggle buttons to switch between AD and BS
- When in AD mode: Use the shadcn Calendar (react-day-picker)
- When in BS mode: Use a custom BS calendar grid (similar to NepaliCalendar but for single selection)
- Output both AD and BS date values for storage
- Show the converted date format below the calendar

```typescript
interface PaymentDatePickerProps {
  selectedDate: Date | null;
  onDateChange: (date: Date, bsDate: { year: number; month: number; day: number }) => void;
  defaultMode?: 'ad' | 'bs';
}
```

**AD Mode:**
- Uses shadcn `Calendar` component with `react-day-picker`
- When date selected, converts to BS using `adToBS()` function
- Displays: "Selected: Jan 22, 2026 (2082 Magh 9)"

**BS Mode:**
- Custom calendar grid with Nepali month names
- When date selected, converts to AD using `bsToAD()` function
- Displays: "Selected: 2082 Magh 9 (Jan 22, 2026)"

---

### 2. Update Finance PaymentDrawer

**File:** `src/components/finance/PaymentDrawer.tsx`

Changes:
- Replace Year/Month/Day dropdowns with `PaymentDatePicker`
- Set default mode to `'ad'`
- Store both AD and BS dates from the picker
- Update state management from `selectedYear/Month/Day` to `selectedDate` (Date) and `selectedBSDate` (object)

**Before (current):**
```tsx
<Label>Payment Date (BS)</Label>
<div className="grid grid-cols-3 gap-2">
  <Select>Year dropdown</Select>
  <Select>Month dropdown</Select>
  <Select>Day dropdown</Select>
</div>
```

**After:**
```tsx
<PaymentDatePicker
  selectedDate={selectedDate}
  onDateChange={(adDate, bsDate) => {
    setSelectedDate(adDate);
    setSelectedBSDate(bsDate);
  }}
  defaultMode="ad"
/>
```

---

### 3. Update Booked PaymentDrawer

**File:** `src/components/booked/PaymentDrawer.tsx`

Same changes as Finance PaymentDrawer - replace dropdown selectors with the new `PaymentDatePicker` component.

---

### 4. Update PaymentHistorySheet Edit Dialog

**File:** `src/components/finance/PaymentHistorySheet.tsx`

Changes:
- Replace the Year/Month/Day inputs in the Edit Payment dialog with `PaymentDatePicker`
- When editing, initialize the picker with the existing payment's date
- Convert the stored BS date to AD Date for initial selection

**Current (lines 461-496):**
```tsx
<div className="space-y-2">
  <Label>Nepali Date (BS)</Label>
  <div className="grid grid-cols-3 gap-2">
    <Input type="number" for year />
    <Select for month />
    <Input type="number" for day />
  </div>
</div>
```

**Updated:**
```tsx
<div className="space-y-2">
  <PaymentDatePicker
    selectedDate={editDateAD}
    onDateChange={(adDate, bsDate) => {
      setEditDateAD(adDate);
      setEditFormData(prev => ({
        ...prev,
        year: String(bsDate.year),
        month: String(bsDate.month),
        day: String(bsDate.day),
      }));
    }}
    defaultMode="ad"
  />
</div>
```

---

## Component Structure

### PaymentDatePicker.tsx

```typescript
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import NepaliDate from "nepali-date-converter";
import { 
  nepaliMonthsEnglish, 
  getDaysInBSMonth, 
  adToBS, 
  bsToAD,
  formatBSDate 
} from "@/lib/nepali-date";
import { format } from "date-fns";

interface PaymentDatePickerProps {
  selectedDate: Date | null;
  onDateChange: (date: Date, bsDate: { year: number; month: number; day: number }) => void;
  defaultMode?: 'ad' | 'bs';
}

export function PaymentDatePicker({ 
  selectedDate, 
  onDateChange, 
  defaultMode = 'ad' 
}: PaymentDatePickerProps) {
  const [mode, setMode] = useState<'ad' | 'bs'>(defaultMode);
  const [bsViewYear, setBsViewYear] = useState(() => {
    const now = new NepaliDate();
    return now.getYear();
  });
  const [bsViewMonth, setBsViewMonth] = useState(() => {
    const now = new NepaliDate();
    return now.getMonth() + 1;
  });

  // Handle AD calendar selection
  const handleADSelect = (date: Date | undefined) => {
    if (date) {
      const bsDate = adToBS(date);
      onDateChange(date, bsDate);
    }
  };

  // Handle BS calendar selection
  const handleBSSelect = (year: number, month: number, day: number) => {
    const adDate = bsToAD(year, month, day) as Date;
    onDateChange(adDate, { year, month, day });
  };

  return (
    <div className="space-y-3">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-slate-300 text-sm">Payment Date</span>
        <div className="flex rounded-lg overflow-hidden border border-slate-600">
          <button
            type="button"
            onClick={() => setMode('ad')}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-all",
              mode === 'ad' 
                ? "bg-emerald-600 text-white" 
                : "bg-slate-800 text-slate-400 hover:text-white"
            )}
          >
            AD
          </button>
          <button
            type="button"
            onClick={() => setMode('bs')}
            className={cn(
              "px-3 py-1.5 text-xs font-medium transition-all",
              mode === 'bs' 
                ? "bg-emerald-600 text-white" 
                : "bg-slate-800 text-slate-400 hover:text-white"
            )}
          >
            BS
          </button>
        </div>
      </div>

      {/* Calendar */}
      {mode === 'ad' ? (
        <ADCalendarView />
      ) : (
        <BSCalendarView />
      )}

      {/* Selected Date Display */}
      {selectedDate && (
        <div className="text-center text-sm">
          {mode === 'ad' ? (
            <span className="text-slate-300">
              {format(selectedDate, "MMMM d, yyyy")} 
              <span className="text-emerald-400 ml-1">
                ({formatBSDate(adToBS(selectedDate))})
              </span>
            </span>
          ) : (
            <span className="text-slate-300">
              {formatBSDate(adToBS(selectedDate))} 
              <span className="text-emerald-400 ml-1">
                ({format(selectedDate, "MMM d, yyyy")})
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Summary of File Changes

| File | Action | Changes |
|------|--------|---------|
| `src/components/finance/PaymentDatePicker.tsx` | CREATE | New reusable calendar component with AD/BS toggle |
| `src/components/finance/PaymentDrawer.tsx` | MODIFY | Replace dropdown date selectors with PaymentDatePicker |
| `src/components/booked/PaymentDrawer.tsx` | MODIFY | Replace dropdown date selectors with PaymentDatePicker |
| `src/components/finance/PaymentHistorySheet.tsx` | MODIFY | Replace edit dialog date inputs with PaymentDatePicker |
| `src/components/finance/index.ts` | MODIFY | Export PaymentDatePicker |

---

## Implementation Notes

1. **Default to AD**: The `defaultMode` prop defaults to `'ad'` so users see the familiar English calendar first
2. **Automatic Conversion**: When selecting a date in either mode, both AD and BS values are computed and passed to the parent
3. **Dark Theme**: Calendar styling matches the slate/emerald Finance Manager theme
4. **Interactive in Dialog/Drawer**: Uses `pointer-events-auto` class to ensure calendar is clickable inside modals
5. **Today Highlighting**: Current date is highlighted in both AD and BS calendar views
6. **Month Navigation**: Both calendars include prev/next month buttons

