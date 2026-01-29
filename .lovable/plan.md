
# Fix Master Sync and Cache Synchronization Issues

## Problem Summary

The user is experiencing a data inconsistency where:
- The client status shows as "BOOKED" in the Booked Clients module
- But shows as "ADVANCE PENDING" in the Client Tracker

This happens because:
1. **Separate Caches**: The CLIENT TRACKER and BOOKED CLIENTS data use separate IndexedDB caches that aren't kept in sync
2. **Missing Cache Refresh**: After Master Sync completes Phase 2 (syncing sheets), the local BOOKED CLIENTS cache is not refreshed with the new data
3. **Stale Data Display**: The Booked Clients module reads from its own cache, which contains outdated data

## Root Cause Analysis

The current data flow has gaps:

```text
Master Sync Phase 1: Refresh CLIENT TRACKER
    ↓
    Saves to IndexedDB cache (app_cache_v1) ✓
    ↓
Master Sync Phase 2: fullResyncAllBookedClients
    ↓
    Syncs CLIENT TRACKER → BOOKED CLIENTS (Google Sheets) ✓
    ↓
    MISSING: Does NOT refresh booked_clients_cache_v1 ✗
    ↓
User navigates to Booked Clients module
    ↓
    Reads from stale booked_clients_cache_v1 ✗
```

## Solution

### 1. Update MasterSyncButton to Refresh Booked Cache After Sync

**File: `src/components/suite/MasterSyncButton.tsx`**

After Phase 2 (fullResyncAllBookedClients) completes successfully:
- Fetch fresh booked clients data from the API
- Save it to the booked clients IndexedDB cache
- Notify cache update listeners

```typescript
// After Phase 2 completes
import { setCachedBookedClients, notifyCacheUpdate } from "@/lib/cache-manager";
import { getBookedClients } from "@/lib/sheets-api";

// Phase 2: Booked Clients (26-50%)
setCurrentPhase('booked');
setProgress(30);

const bookedResult = await fullResyncAllBookedClients(true);

// NEW: Refresh booked clients cache after sync
const freshBookedClients = await getBookedClients(500);
await setCachedBookedClients(freshBookedClients);
notifyCacheUpdate('booked-clients', freshBookedClients);

setSyncStats(prev => ({ ...prev, synced: bookedResult.syncedCount + bookedResult.copiedCount }));
setProgress(50);
```

### 2. Ensure Status Change Updates Both Caches

When a status change occurs (especially to BOOKED), both caches should be updated:

**File: `src/pages/ClientDetail.tsx`**

After a successful status change to BOOKED:
- Update the client tracker cache (already done)
- Invalidate/refresh the booked clients cache

```typescript
// After successful BOOKED status change
import { setCachedBookedClients, notifyCacheUpdate, getCachedBookedClients } from "@/lib/cache-manager";

// Update status to BOOKED
const statusResult = await updateClientStatus(client.rowNumber, pendingStatus, currentStatusLog || client.statusLog || '');
setCurrentStatusLog(statusResult.statusLog);

// Update global client tracker cache
if (updateClientCache) {
  updateClientCache({
    ...client,
    paymentsMade: paymentResult.paymentsMade,
    remainingPayment: paymentResult.remainingPayment,
    statusLog: statusResult.statusLog
  });
}

// NEW: Invalidate booked clients cache to force refresh on next access
// This ensures the booked module shows the new BOOKED client
notifyCacheUpdate('booked-clients-invalidate');
```

### 3. Apply Same Fix to DesktopClientRow.tsx

**File: `src/components/desktop/DesktopClientRow.tsx`**

Same pattern: after status change to BOOKED, invalidate the booked cache.

### 4. Listen for Cache Invalidation in useBookedCachedData

**File: `src/hooks/useBookedCachedData.ts`**

Add a listener for cache invalidation events:

```typescript
// Listen for cache updates/invalidation from other operations
useEffect(() => {
  const handleCacheUpdate = (e: CustomEvent<{ type: string; data: unknown }>) => {
    if (e.detail.type === 'booked-clients' && Array.isArray(e.detail.data)) {
      setClients(e.detail.data as BookedClientData[]);
      setLastSyncedAt(new Date());
      setIsFromCache(false);
    }
    // Handle invalidation - trigger refresh
    if (e.detail.type === 'booked-clients-invalidate') {
      fetchState.hasRefreshed = false; // Reset refresh flag
      refreshData(); // Force a fresh fetch
    }
  };
  
  window.addEventListener('cache-updated', handleCacheUpdate as EventListener);
  return () => window.removeEventListener('cache-updated', handleCacheUpdate as EventListener);
}, [refreshData]);
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/suite/MasterSyncButton.tsx` | Add booked cache refresh after Phase 2 sync |
| `src/pages/ClientDetail.tsx` | Invalidate booked cache after BOOKED status change |
| `src/components/desktop/DesktopClientRow.tsx` | Invalidate booked cache after BOOKED status change |
| `src/hooks/useBookedCachedData.ts` | Add cache invalidation listener |
| `src/lib/cache-manager.ts` | Add helper for cache invalidation notification |

## Implementation Order

1. Update `cache-manager.ts` to handle invalidation event type
2. Update `useBookedCachedData.ts` to listen for invalidation
3. Update `MasterSyncButton.tsx` to refresh booked cache after sync
4. Update `ClientDetail.tsx` to invalidate booked cache on BOOKED status
5. Update `DesktopClientRow.tsx` with same invalidation logic

## Data Flow After Fix

```text
Master Sync Phase 1: Refresh CLIENT TRACKER
    ↓
    Saves to IndexedDB cache (app_cache_v1) ✓
    ↓
Master Sync Phase 2: fullResyncAllBookedClients
    ↓
    Syncs CLIENT TRACKER → BOOKED CLIENTS (Google Sheets) ✓
    ↓
    NEW: Fetch fresh booked clients ✓
    ↓
    NEW: Save to booked_clients_cache_v1 ✓
    ↓
    NEW: Notify listeners ✓
    ↓
User navigates to Booked Clients module
    ↓
    Reads fresh booked_clients_cache_v1 ✓
```

## Technical Notes

1. **API Call Efficiency**: The extra `getBookedClients` call after sync is necessary because `fullResyncAllBookedClients` only returns sync statistics, not the actual client data.

2. **Cache Invalidation vs Refresh**: Using invalidation + refresh pattern ensures components can decide when to fetch, preventing unnecessary API calls during rapid updates.

3. **Event-Based Communication**: The `cache-updated` CustomEvent pattern is already established in the codebase and is HMR-safe.

4. **Backward Compatibility**: The existing `notifyCacheUpdate` function already supports arbitrary type strings, so no breaking changes are needed.
