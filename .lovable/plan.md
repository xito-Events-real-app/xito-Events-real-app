
# Plan: Fix Breaking News Not Showing New Comments

## Problem

When a new comment is added and the user clicks "Refresh" on the Breaking News sidebar, the new comment does not appear because:

1. The `useCachedData` hook does NOT listen for a `clients-invalidate` event to trigger a fresh refetch
2. The `handleRefreshNews` function dispatches events but the hooks don't respond properly
3. Both data sources (CLIENT TRACKER and BOOKED CLIENTS) need to refetch, but only BOOKED CLIENTS has proper invalidation handling

## Root Cause Analysis

### Current Refresh Flow (Broken)
```text
1. User clicks "Refresh" button
2. handleRefreshNews() calls:
   - notifyCacheUpdate('clients')              -> No data passed, useCachedData ignores it
   - notifyCacheUpdate('booked-clients-invalidate') -> Works! Triggers refreshData()
   - window.dispatchEvent('clients-invalidate')    -> Nobody listens for this!
   - window.dispatchEvent('booked-clients-invalidate') -> Works via cache-updated event
3. Result: Only BOOKED CLIENTS data refreshes, not CLIENT TRACKER data
```

### Why Comments Don't Appear
- Comments added to CLIENT TRACKER clients are parsed from `useCachedData().clients`
- `useCachedData` never refetches when "Refresh" is clicked
- Old cached data is displayed instead of fetching new data from Google Sheets

---

## Solution

Add invalidation handling to `useCachedData` hook so it properly triggers `refreshData()` when a `clients-invalidate` event is received.

---

## Technical Changes

### File 1: `src/hooks/useCachedData.ts`

**Change**: Add listener for `clients-invalidate` event type in the `cache-updated` handler

**Current Code** (lines 235-248):
```typescript
useEffect(() => {
  const handleCacheUpdate = (e: CustomEvent<{ type: string; data: unknown }>) => {
    if (e.detail.type === 'clients' && Array.isArray(e.detail.data)) {
      setClients(e.detail.data as ClientData[]);
    }
    if (e.detail.type === 'dropdowns' && e.detail.data) {
      setDropdowns(e.detail.data as DropdownData);
    }
  };
  
  window.addEventListener('cache-updated', handleCacheUpdate as EventListener);
  return () => window.removeEventListener('cache-updated', handleCacheUpdate as EventListener);
}, []);
```

**Updated Code**:
```typescript
useEffect(() => {
  const handleCacheUpdate = (e: CustomEvent<{ type: string; data: unknown }>) => {
    if (e.detail.type === 'clients' && Array.isArray(e.detail.data)) {
      setClients(e.detail.data as ClientData[]);
    }
    if (e.detail.type === 'dropdowns' && e.detail.data) {
      setDropdowns(e.detail.data as DropdownData);
    }
    // Handle invalidation - trigger refresh (similar to useBookedCachedData)
    if (e.detail.type === 'clients-invalidate') {
      fetchState.hasRefreshed = false; // Reset refresh flag to allow refetch
      refreshData(); // Force a fresh fetch from Google Sheets
    }
  };
  
  window.addEventListener('cache-updated', handleCacheUpdate as EventListener);
  return () => window.removeEventListener('cache-updated', handleCacheUpdate as EventListener);
}, [refreshData]);
```

**Note**: The dependency array now includes `refreshData` since we're using it inside the effect.

---

### File 2: `src/lib/cache-manager.ts`

**Change**: Add `clients-invalidate` to the valid type union

**Current Code** (line 269):
```typescript
export function notifyCacheUpdate(type: 'clients' | 'dropdowns' | 'all' | 'booked-clients' | 'booked-clients-invalidate', data?: unknown): void {
```

**Updated Code**:
```typescript
export function notifyCacheUpdate(type: 'clients' | 'clients-invalidate' | 'dropdowns' | 'all' | 'booked-clients' | 'booked-clients-invalidate', data?: unknown): void {
```

---

### File 3: `src/components/suite/DesktopSuiteLanding.tsx`

**Change**: Update `handleRefreshNews` to use the correct invalidation event type

**Current Code** (lines 32-48):
```typescript
const handleRefreshNews = async () => {
  setIsRefreshing(true);
  try {
    // Trigger cache invalidation events to force fresh fetch
    notifyCacheUpdate('clients');
    notifyCacheUpdate('booked-clients-invalidate');
    
    // Dispatch events to trigger refetch in hooks
    window.dispatchEvent(new CustomEvent('clients-invalidate'));
    window.dispatchEvent(new CustomEvent('booked-clients-invalidate'));
    
    toast.success("News refreshed!");
  } catch (error) {
    toast.error("Failed to refresh news");
  } finally {
    setTimeout(() => setIsRefreshing(false), 1000);
  }
};
```

**Updated Code**:
```typescript
const handleRefreshNews = async () => {
  setIsRefreshing(true);
  try {
    // Trigger cache invalidation events to force fresh fetch from Google Sheets
    notifyCacheUpdate('clients-invalidate');
    notifyCacheUpdate('booked-clients-invalidate');
    
    toast.success("News refreshed!");
  } catch (error) {
    toast.error("Failed to refresh news");
  } finally {
    // Wait a bit longer for the actual data refresh to complete
    setTimeout(() => setIsRefreshing(false), 2000);
  }
};
```

**Why simplified**: The `notifyCacheUpdate` function already dispatches `cache-updated` CustomEvents - no need to dispatch additional raw events. Using the proper `clients-invalidate` type ensures the hook's handler picks it up.

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useCachedData.ts` | Add handler for `clients-invalidate` event type to trigger `refreshData()` |
| `src/lib/cache-manager.ts` | Add `clients-invalidate` to the valid type union for TypeScript |
| `src/components/suite/DesktopSuiteLanding.tsx` | Use `clients-invalidate` instead of plain `clients` in refresh handler |

---

## Expected Result After Fix

1. User adds a comment to a client
2. Backend writes to Column AC (comments) AND Column AJ (activity log)
3. User clicks "Refresh" in Breaking News
4. Both `useCachedData` and `useBookedCachedData` trigger `refreshData()`
5. Fresh data is fetched from Google Sheets (including new comments)
6. Activity parser finds the new comment in Column AJ (or fallback to Column AC)
7. New comment appears in Breaking News feed with correct timestamp and relative time
