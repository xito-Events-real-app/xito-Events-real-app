
# Plan: Enhance Finance Manager with Booked-Style Month Filter, Event Display, and Payment Editing

## Overview

This plan addresses three key improvements to the Finance Manager:
1. **Month filter styled exactly like Booked Clients** - vertical tabs, not dropdowns
2. **Enhanced table display** with handler colors and stacked event dates (e.g., "BRIDES MEHNDI FALGUN 6 2082")
3. **Edit old payments** when clicking client name in payment history

---

## Technical Changes

### 1. Update Finance Sidebar Month Filter (`src/components/finance/DesktopFinanceSidebar.tsx`)

The month filter is already styled as vertical tabs like Booked Clients (lines 230-266). This is correct, but we need to ensure it uses the same gradient colors and styling.

**Current (already correct):**
```tsx
<button
  onClick={() => onMonthFilter(null)}
  className={cn(
    "w-full px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
    selectedMonth === null
      ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white"
      : "text-white/70 hover:bg-white/10 hover:text-white border border-white/20"
  )}
>
  ALL MONTHS
</button>
```

This matches the Booked Clients sidebar style already. No changes needed here.

---

### 2. Add Handler Color Mapping (`src/components/finance/DesktopFinanceManager.tsx`)

Add the same handler color palette used in Dashboard and assign colors based on handler index.

**Add at top of file (after imports):**
```typescript
// Handler color palette (same as Dashboard)
const handlerColors = [
  'text-violet-400',
  'text-cyan-400',
  'text-emerald-400',
  'text-orange-400',
  'text-pink-400',
  'text-amber-400',
];

// Background versions for badges
const handlerBgColors = [
  'bg-violet-500/20 border-violet-500/50',
  'bg-cyan-500/20 border-cyan-500/50',
  'bg-emerald-500/20 border-emerald-500/50',
  'bg-orange-500/20 border-orange-500/50',
  'bg-pink-500/20 border-pink-500/50',
  'bg-amber-500/20 border-amber-500/50',
];
```

**Create handler-to-color mapping:**
```typescript
// In component, after handlers useMemo
const handlerColorMap = useMemo(() => {
  const map = new Map<string, { text: string; bg: string }>();
  handlers.forEach((handler, idx) => {
    map.set(handler.name, {
      text: handlerColors[idx % handlerColors.length],
      bg: handlerBgColors[idx % handlerBgColors.length],
    });
  });
  return map;
}, [handlers]);
```

---

### 3. Update Table Client Column with Handler Color

**Current (lines 514-519):**
```tsx
<TableCell>
  <div>
    <p className="font-medium text-white">{client.clientName}</p>
    <p className="text-xs text-slate-400">{client.clientHandler || '-'}</p>
  </div>
</TableCell>
```

**New Design:**
```tsx
<TableCell>
  <div className="space-y-1">
    <p className="font-semibold text-white cursor-pointer hover:text-emerald-300">
      {client.clientName}
    </p>
    {client.clientHandler && (
      <Badge className={cn(
        "text-xs px-2 py-0.5 font-medium",
        handlerColorMap.get(client.clientHandler.trim().toUpperCase())?.bg || 'bg-slate-500/20'
      )}>
        <span className={handlerColorMap.get(client.clientHandler.trim().toUpperCase())?.text || 'text-slate-400'}>
          {client.clientHandler}
        </span>
      </Badge>
    )}
  </div>
</TableCell>
```

---

### 4. Update Event Date Column with Stacked Format

**Current (lines 520-522):**
```tsx
<TableCell className="text-slate-300">
  {formatNepaliEventDate(client.eventYear, client.eventMonth, client.eventDay)}
</TableCell>
```

**New Design - Parse multiple events and stack vertically:**

Add event parsing logic (similar to DesktopClientRow):
```typescript
// Parse events for a client (add as helper function)
const parseClientEvents = (client: BookedClientData) => {
  const events = client.events?.split('\n').filter(Boolean) || [];
  const years = client.eventYear?.split('\n').filter(Boolean) || [];
  const months = client.eventMonth?.split('\n').filter(Boolean) || [];
  const days = client.eventDay?.split('\n').filter(Boolean) || [];
  
  return events.map((eventName, i) => ({
    eventName: eventName.trim(),
    year: years[i] || '',
    month: months[i] || '',
    monthName: getMonthName(parseInt(months[i] || '0', 10)),
    day: days[i] || '',
  }));
};
```

**Updated Event Date Column:**
```tsx
<TableCell className="text-slate-300">
  <div className="space-y-1">
    {parseClientEvents(client).map((event, idx) => (
      <div key={idx} className="flex flex-col">
        <span className="text-xs font-semibold text-white">{event.eventName}</span>
        <span className="text-xs text-emerald-400">
          {event.monthName} {event.day} {event.year}
        </span>
      </div>
    ))}
    {parseClientEvents(client).length === 0 && (
      <span className="text-xs text-slate-500">
        {formatNepaliEventDate(client.eventYear, client.eventMonth, client.eventDay)}
      </span>
    )}
  </div>
</TableCell>
```

---

### 5. Add Edit Functionality to Payment History (`src/components/finance/PaymentHistorySheet.tsx`)

Currently, PaymentHistorySheet only shows payments and allows adding new ones. We need to add an "Edit" button to each payment row.

**Add Edit State and Handler:**
```typescript
const [editingPayment, setEditingPayment] = useState<number | null>(null);
const [editedPayments, setEditedPayments] = useState<ParsedPayment[]>([]);

// Initialize edited payments when sheet opens
useEffect(() => {
  setEditedPayments(payments);
}, [payments]);
```

**Add Edit Button to Each Row (in Table):**
```tsx
<TableRow key={index} className="border-slate-700 hover:bg-slate-800/30">
  {/* ... existing cells ... */}
  <TableCell>
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={() => setEditingPayment(index)}
      title="Edit this payment"
    >
      <Edit className="h-3.5 w-3.5 text-slate-400 hover:text-emerald-400" />
    </Button>
  </TableCell>
</TableRow>
```

**Add Edit Payment Dialog:**
```tsx
<Dialog open={editingPayment !== null} onOpenChange={() => setEditingPayment(null)}>
  <DialogContent className="bg-slate-900 border-slate-700">
    <DialogHeader>
      <DialogTitle className="text-white">Edit Payment</DialogTitle>
    </DialogHeader>
    {/* Form fields for editing amount, type, date, bank */}
    {/* Save and Cancel buttons */}
  </DialogContent>
</Dialog>
```

**Backend Integration:**
This will require a new edge function endpoint `updatePayment` that:
1. Finds the specific payment line in the paymentsMade string
2. Replaces it with the updated values
3. Recalculates remaining payment

---

## Summary of File Changes

| File | Changes |
|------|---------|
| `src/components/finance/DesktopFinanceManager.tsx` | Add handler color mapping, update Client column with colored handler badge, update Event Date column with stacked event format |
| `src/components/finance/PaymentHistorySheet.tsx` | Add Edit column to payment table, add edit payment dialog/drawer with form |
| `supabase/functions/google-sheets/index.ts` | Add new `updatePayment` function to edit existing payment entries |
| `src/lib/sheets-api.ts` | Add `updatePayment` API function |

---

## Visual Mockup

**Table Row Layout:**
```
┌────────────────────────┬─────────────────────┬────────┬─────────┬────────┬───────────┬──────────┬─────────┐
│ CLIENT                 │ EVENT DATES         │ STATUS │ QUOTE   │ PAID   │ REMAINING │ PROGRESS │ ACTIONS │
├────────────────────────┼─────────────────────┼────────┼─────────┼────────┼───────────┼──────────┼─────────┤
│ SAPNA BISTA            │ BRIDES MEHNDI       │ Partial│ NPR     │ NPR    │ NPR       │ ████░░   │ 📞 💬 📜│
│ [BENZO] (violet badge) │ FALGUN 6 2082       │        │ 200,000 │ 80,000 │ 120,000   │ 40%      │         │
│                        │                     │        │         │        │           │          │         │
│                        │ WEDDING             │        │         │        │           │          │         │
│                        │ FALGUN 7 2082       │        │         │        │           │          │         │
└────────────────────────┴─────────────────────┴────────┴─────────┴────────┴───────────┴──────────┴─────────┘
```

**Payment History with Edit:**
```
┌──────────────┬──────────┬──────────────┬────────┬──────────┐
│ AMOUNT       │ TYPE     │ DATE         │ BANK   │ ACTIONS  │
├──────────────┼──────────┼──────────────┼────────┼──────────┤
│ NPR 50,000/- │ ADVANCE  │ 2082 MAGH 15 │ ESEWA  │ ✏️ Edit  │
│ NPR 30,000/- │ PARTIAL  │ 2082 FALGUN 2│ BANK   │ ✏️ Edit  │
└──────────────┴──────────┴──────────────┴────────┴──────────┘
                                                   [+ Add Payment]
```

---

## Implementation Notes

1. **Handler Colors**: Same 6-color palette used in Dashboard for consistency
2. **Event Parsing**: Uses newline-delimited format matching existing storage pattern
3. **Edit Payment**: Will update the existing payment line in Column AE (paymentsMade) and recalculate Column AG (remainingPayment)
4. **Month Filter**: Already matches Booked Clients style - vertical tabs with gradient active state
