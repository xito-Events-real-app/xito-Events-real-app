
# Plan: Fix Bank Dropdown & Dynamic Dashboard Stats

## Overview

Two changes needed:
1. **Bank dropdown in Edit Payment** - Use dynamic banks from Google Sheets (same as Add Payment)
2. **Dashboard summary stats** - Update Total Value, Collected, and Pending when sidebar filters change

---

## Changes

### 1. PaymentHistorySheet.tsx - Dynamic Bank Dropdown

**Current Problem**: Lines 500-506 have hardcoded bank options (ESEWA, KHALTI, BANK, CASH, FONEPAY, OTHER)

**Solution**: Fetch banks from `getDropdowns()` when the sheet opens (same pattern as PaymentDrawer)

**Add state and fetch effect:**
```typescript
// Add state
const [banks, setBanks] = useState<string[]>([]);

// Fetch when sheet opens
useEffect(() => {
  const fetchBanks = async () => {
    try {
      const data = await getDropdowns();
      setBanks(data.banks || []);
    } catch (error) {
      setBanks(['ESEWA', 'KHALTI', 'BANK', 'CASH', 'FONEPAY']); // Fallback
    }
  };
  if (isOpen) {
    fetchBanks();
  }
}, [isOpen]);
```

**Update Bank dropdown** (replace lines 500-507):
```tsx
<SelectContent className="bg-slate-800 border-slate-700">
  {banks.map((b) => (
    <SelectItem key={b} value={b} className="text-white">
      {b}
    </SelectItem>
  ))}
</SelectContent>
```

---

### 2. DesktopFinanceManager.tsx - Dynamic Stats

**Current Problem**: Lines 142-157 calculate totals from the full `clients` array, so values never change when filters are applied

**Solution**: Use `filteredClients` instead of `clients` and wrap in `useMemo`

**Update calculations:**
```typescript
// Calculate summary stats FROM FILTERED CLIENTS
const totalBookedValue = useMemo(() => {
  return filteredClients.reduce((sum, client) => {
    const match = client.finalQuotation?.match(/NPR\s*([\d,]+)/);
    return sum + (match ? parseInt(match[1].replace(/,/g, '')) : 0);
  }, 0);
}, [filteredClients]);

const totalPaidValue = useMemo(() => {
  return filteredClients.reduce((sum, client) => {
    if (!client.paymentsMade) return sum;
    const payments = client.paymentsMade.split('\n');
    return sum + payments.reduce((pSum, entry) => {
      const match = entry.match(/NPR\s*([\d,]+)/);
      return pSum + (match ? parseInt(match[1].replace(/,/g, '')) : 0);
    }, 0);
  }, 0);
}, [filteredClients]);

const remainingValue = useMemo(() => totalBookedValue - totalPaidValue, [totalBookedValue, totalPaidValue]);
const collectionRate = useMemo(() => 
  totalBookedValue > 0 ? (totalPaidValue / totalBookedValue) * 100 : 0, 
  [totalBookedValue, totalPaidValue]
);
```

---

## Expected Behavior

| Feature | Before | After |
|---------|--------|-------|
| Edit Payment Banks | Hardcoded 6 options | Dynamic from Google Sheets (same as Add Payment) |
| Dashboard Stats | Always show all clients | Update when Handler, Month, or Payment Status filters change |

**Example**: Select "BENZO" handler in sidebar -> Stats update to show only BENZO's totals

---

## Files Changed

| File | Changes |
|------|---------|
| `src/components/finance/PaymentHistorySheet.tsx` | Add `getDropdowns` import, add `banks` state, fetch on open, use dynamic dropdown |
| `src/components/finance/DesktopFinanceManager.tsx` | Change summary calculations to use `filteredClients` with `useMemo` |
