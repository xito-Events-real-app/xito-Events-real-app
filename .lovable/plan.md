

## Fix: Consolidate "QUOTATION SENT" Variants to Single Category

Currently, two separate categories can appear in the sidebar:
- "QUOTATION SENT"  
- "QUOTATION SENT : REVIEW PENDING"

These should be consolidated into a single canonical status: **"QUOTATION SENT : REVIEW PENDING"**

---

### Root Cause

The `normalizeStatus()` function in `src/lib/status-config.ts` already correctly maps:
```typescript
if (s.includes('QUOTATION SENT')) return 'QUOTATION SENT : REVIEW PENDING';
```

However, this normalization is **not applied consistently** in all places where statuses are grouped/counted.

---

### Files Using Normalization (Already Fixed)

| File | Status |
|------|--------|
| `src/components/desktop/DesktopAppLayout.tsx` | Uses `normalizeStatus()` when counting categories |

---

### Files Missing Normalization (Need Fix)

| File | Issue | Fix |
|------|-------|-----|
| `src/components/desktop/DesktopDashboard.tsx` | Counts raw status strings (lines 141-148) | Apply `normalizeStatus()` before counting |
| `src/pages/FreshClients.tsx` | Groups clients by raw status (lines 65-77) | Apply `normalizeStatus()` when grouping |
| `src/hooks/useSuiteStats.ts` | Uses hardcoded "QUOTATION SENT" in active leads check (line 116) | Update to canonical status or use includes pattern |

---

### Changes Required

**1. `src/components/desktop/DesktopDashboard.tsx` (lines 141-148)**
```typescript
// Before:
const statusCounts = useMemo(() => {
  const counts: Record<string, number> = {};
  statsClients.forEach(client => {
    const status = getCurrentStatus(client.statusLog || '').toUpperCase();
    counts[status] = (counts[status] || 0) + 1;
  });
  return counts;
}, [statsClients]);

// After:
const statusCounts = useMemo(() => {
  const counts: Record<string, number> = {};
  statsClients.forEach(client => {
    const rawStatus = getCurrentStatus(client.statusLog || '').toUpperCase();
    const status = normalizeStatus(rawStatus);  // ← ADD THIS
    if (status !== 'UNTOUCHED') {
      counts[status] = (counts[status] || 0) + 1;
    }
  });
  return counts;
}, [statsClients]);
```

**2. `src/pages/FreshClients.tsx` (lines 65-77)**
```typescript
// Before:
const clientsByStatus = useMemo(() => {
  const grouped: Record<string, ClientData[]> = {};
  localClients.forEach(client => {
    const status = getCurrentStatus(client.statusLog || '');
    if (!grouped[status]) {
      grouped[status] = [];
    }
    grouped[status].push(client);
  });
  return grouped;
}, [localClients]);

// After:
const clientsByStatus = useMemo(() => {
  const grouped: Record<string, ClientData[]> = {};
  localClients.forEach(client => {
    const rawStatus = getCurrentStatus(client.statusLog || '');
    const status = normalizeStatus(rawStatus);  // ← ADD THIS
    if (status !== 'UNTOUCHED') {
      if (!grouped[status]) {
        grouped[status] = [];
      }
      grouped[status].push(client);
    }
  });
  return grouped;
}, [localClients]);
```

**3. `src/hooks/useSuiteStats.ts` (line 116)**
```typescript
// Before:
"QUOTATION SENT",

// After (use includes pattern for safety):
// The check already uses .includes() pattern, so both variants will match
// No change needed here - it's checking if status CONTAINS these strings
```

---

### Import Addition Required

Add `normalizeStatus` import in files where it's missing:

**`src/components/desktop/DesktopDashboard.tsx`:**
```typescript
import { getStatusConfig, sortCategoriesByOrder, normalizeStatus } from "@/lib/status-config";
```

**`src/pages/FreshClients.tsx`:**
```typescript
import { normalizeStatus } from "@/lib/status-config";
```

---

### Result

After this fix:
- Only **"QUOTATION SENT : REVIEW PENDING"** will appear in sidebar
- Both raw variants ("QUOTATION SENT" and "QUOTATION SENT : REVIEW PENDING") will be merged into single count
- Consistent behavior across all dashboard views

