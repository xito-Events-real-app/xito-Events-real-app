

# Plan: Fix Cold Dates Display - Full Status Visibility

## Issues to Fix

1. **Status truncated**: Currently showing only first word (e.g., "NUMBER" instead of "NUMBER PROVIDED")
2. **Text truncation**: Client names and event names cut off by `truncate` class
3. **Fixed card widths**: All cards same size regardless of content
4. **Date sorting**: 2082/2083 mixed, `**` dates not at end
5. **Year position**: Should show year first (2082 MAGH 23)

---

## Technical Changes

### File: `src/components/desktop/DesktopDashboard.tsx`

### 1. Fix Sorting Logic (lines 347-351)

**Current:**
```typescript
.sort((a, b) => {
  const monthDiff = parseInt(a.month) - parseInt(b.month);
  if (monthDiff !== 0) return monthDiff;
  return b.enquiringClients.length - a.enquiringClients.length;
});
```

**New - Year first, `**` dates last:**
```typescript
.sort((a, b) => {
  // Push ** dates to the end
  const aIsUnknown = a.day.includes('*');
  const bIsUnknown = b.day.includes('*');
  if (aIsUnknown && !bIsUnknown) return 1;
  if (!aIsUnknown && bIsUnknown) return -1;
  
  // Sort by year first (2082 before 2083)
  const yearDiff = parseInt(a.year) - parseInt(b.year);
  if (yearDiff !== 0) return yearDiff;
  
  // Then by month, then by day
  const monthDiff = parseInt(a.month) - parseInt(b.month);
  if (monthDiff !== 0) return monthDiff;
  
  return parseInt(a.day) - parseInt(b.day);
});
```

### 2. Change Grid to Flexible Layout (line 726)

**Current:**
```tsx
<div className="grid grid-cols-4 gap-4 pr-4">
```

**New - Auto-sizing cards:**
```tsx
<div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4 pr-4">
```

### 3. Fix Date Header - Year First (lines 733-741)

**Current:**
```tsx
<Snowflake className="w-4 h-4 text-cyan-500" />
<Badge className="...">
  {dateInfo.monthName} {dateInfo.day}
</Badge>
<span className="text-xs">{dateInfo.year}</span>
```

**New:**
```tsx
<Snowflake className="w-4 h-4 text-cyan-500" />
<span className="text-sm font-bold text-cyan-700">{dateInfo.year}</span>
<Badge className="...">
  {dateInfo.monthName} {dateInfo.day}
</Badge>
```

### 4. Fix Client Row - Remove Truncation, Show Full Status (lines 746-765)

**Current:**
```tsx
<Link className="flex items-center gap-2 p-1.5 ...">
  <span className="font-medium text-xs truncate flex-1">
    {client.clientName}
  </span>
  <span className="text-[10px] truncate max-w-[50px]">
    {client.eventName}
  </span>
  <Badge className="text-[9px] px-1.5 py-0">
    {client.statusShort}
  </Badge>
  <span className="text-[10px] font-bold">
    {client.handlerInitials}
  </span>
</Link>
```

**New - Full visibility with flex-wrap:**
```tsx
<Link className="flex flex-wrap items-center gap-x-2 gap-y-1 p-2 ...">
  <span className="font-semibold text-sm text-foreground">
    {client.clientName}
  </span>
  <span className="text-xs text-amber-600">
    • {client.eventName}
  </span>
  <Badge variant="outline" className="text-[10px] px-2 py-0.5 shrink-0 bg-slate-100">
    {client.status}  {/* Full status instead of statusShort */}
  </Badge>
  <span className="text-xs font-bold text-cyan-600">
    {client.handlerInitials}
  </span>
</Link>
```

---

## Visual Result

**Before:**
```
┌────────────────────────┐
│ ❄️ MAGH 23  2082    2  │
│ BKARKI... • ... NUMBER │
│ BKARKI... • ... NUMBER │
└────────────────────────┘
```

**After:**
```
┌─────────────────────────────────────────────────────┐
│ ❄️ 2082  MAGH 23                                  2 │
│ BKARKI • COURT MARRIAGE  [NUMBER PROVIDED]       NI │
│ BKARKI • POST SHOOT      [QUOTATION SENT]        NI │
└─────────────────────────────────────────────────────┘
```

---

## Summary of Changes

| Line | Change |
|------|--------|
| 347-351 | Fix sorting: year first, `**` dates last |
| 726 | Change grid to `auto-fill` with `minmax(320px, 1fr)` |
| 733-741 | Rearrange header: year first before month+day |
| 746-765 | Remove truncation, use `flex-wrap`, show full `client.status` instead of `statusShort` |

