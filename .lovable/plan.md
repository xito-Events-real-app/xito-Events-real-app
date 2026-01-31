
# Plan: Fix 404 Error on Back Navigation from Client Detail

## Problem Summary

When navigating back from a client's detail page, the app shows a 404 error. The current URL in the error is:
```
/client-tracker/client/2026-01-18T19:25:45.624Z/search
```

This happens because the Master Search passes `from: 'search'` (a plain string flag) as the navigation state. When `handleBack()` in ClientDetail.tsx calls `navigate(fromState.from)`, React Router interprets `'search'` as a **relative path** and appends it to the current URL, creating an invalid route.

## Root Cause Analysis

| Source | Value of `from` | Result |
|--------|-----------------|--------|
| Master Search | `'search'` | `navigate('search')` appends `/search` to URL - **BROKEN** |
| Dashboard | `'/client-tracker'` | Works correctly - absolute path |
| Booked Clients | `'/booked-clients'` | Works correctly - absolute path |
| ActivityCard | `undefined` (no state) | Falls through to `navigate(-1)` - may work |
| StarClientDetailView | `undefined` (no state) | Falls through to `navigate(-1)` - may work |

The issue is that `'search'` is NOT a valid path. It's being used as a **flag** for the sequential navigation feature, but `handleBack()` tries to navigate to it as if it were a route.

## Solution

### Strategy: Separate "from path" from "search context flag"

1. **Fix MasterSearchButton**: Pass actual path (`'/'` for Suite Landing) as `from`, and use a separate `searchContext` property for the flag
2. **Fix ClientDetail.tsx**: Check `searchContext` for search-specific features, use `from` only for valid path navigation
3. **Fix ActivityCard & StarClientDetailView**: Pass proper `from` state with `location.pathname`

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/suite/MasterSearchButton.tsx` | Change `from: 'search'` to `from: '/'` and add `searchContext: 'search'` |
| `src/pages/ClientDetail.tsx` | Check `searchContext` instead of `from === 'search'` for sequential nav |
| `src/components/suite/ActivityCard.tsx` | Add `from` state with `location.pathname` |
| `src/components/suite/StarClientDetailView.tsx` | Add `from` state with `location.pathname` |

---

## Implementation Details

### 1. MasterSearchButton.tsx (Line 201-208)

**Current:**
```typescript
navigate(getClientDetailPath(client), {
  state: {
    from: 'search',  // BUG: Not a valid path
    searchQuery: query,
    resultIds: results.map(r => getClientNavigationId(r)),
    currentIndex: results.indexOf(client)
  }
});
```

**Fixed:**
```typescript
navigate(getClientDetailPath(client), {
  state: {
    from: '/',  // Suite Landing - actual path for back navigation
    searchContext: 'search',  // Flag for sequential navigation feature
    searchQuery: query,
    resultIds: results.map(r => getClientNavigationId(r)),
    currentIndex: results.indexOf(client)
  }
});
```

### 2. ClientDetail.tsx (Line 220-232)

**Current:**
```typescript
if (fromState?.from === 'search' && fromState.resultIds && fromState.currentIndex !== undefined) {
```

**Fixed:**
```typescript
if (fromState?.searchContext === 'search' && fromState.resultIds && fromState.currentIndex !== undefined) {
```

Also update the `fromState` type definition (Line 210-217):
```typescript
const fromState = location.state as { 
  from?: string; 
  searchContext?: string;  // ADD THIS
  filters?: any; 
  scrollPosition?: number;
  searchQuery?: string;
  resultIds?: (number | string)[];
  currentIndex?: number;
} | null;
```

### 3. ActivityCard.tsx (Line 43-47)

**Current:**
```typescript
const handleClick = () => {
  if (activity.clientId) {
    const path = getClientDetailPath({ registeredDateTimeAD: activity.clientId });
    navigate(path);
  }
};
```

**Fixed:**
```typescript
const handleClick = () => {
  if (activity.clientId) {
    const path = getClientDetailPath({ registeredDateTimeAD: activity.clientId });
    navigate(path, { state: { from: '/' } });  // Suite Landing path
  }
};
```

### 4. StarClientDetailView.tsx (Line 23-25)

**Current:**
```typescript
const handleViewDetails = (client: typeof starClients[0]) => {
  navigate(getClientDetailPath(client));
};
```

**Fixed:**
```typescript
const handleViewDetails = (client: typeof starClients[0]) => {
  navigate(getClientDetailPath(client), { state: { from: '/' } });  // Suite Landing path
};
```

---

## Data Flow After Fix

```text
User clicks client in Master Search
         ↓
navigate('/client-tracker/client/XXX', {
  state: {
    from: '/',                  // Valid absolute path
    searchContext: 'search',    // Flag for prev/next navigation
    searchQuery: 'BARUN',
    resultIds: [...],
    currentIndex: 2
  }
})
         ↓
Client Detail page loads
- Sequential navigation uses searchContext === 'search'
- Prev/Next buttons work using resultIds
         ↓
User clicks Back button
         ↓
handleBack() reads fromState.from = '/'
         ↓
navigate('/')  // Absolute path - goes to Suite Landing correctly!
```

---

## Why This Works

- **Absolute vs Relative paths**: Paths starting with `/` are absolute (navigate to exact route). Paths without `/` are relative (appended to current path)
- `from: '/'` → `navigate('/')` → Goes to Suite Landing
- `from: '/client-tracker'` → `navigate('/client-tracker')` → Goes to Dashboard
- `from: 'search'` → `navigate('search')` → Appends `/search` to current URL → **404 ERROR**

---

## Testing Checklist

After implementation, verify these scenarios:

1. **From Master Search**: Search for client → Click result → Click Back → Should return to Suite Landing (/)
2. **From Dashboard**: Click client → Click Back → Should return to Dashboard (/client-tracker)
3. **From Booked Clients**: Click client → Click Back → Should return to Booked (/booked-clients)
4. **From Activity Card**: Click activity → Click Back → Should return to Suite Landing (/)
5. **From Star Clients**: Click star client → Click Back → Should return to Suite Landing (/)
6. **Prev/Next Navigation**: From Master Search results, verify Prev/Next buttons still work correctly
