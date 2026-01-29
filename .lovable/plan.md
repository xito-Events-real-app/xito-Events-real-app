
# Fix: Off-By-One Client Navigation Bug

## Problem Analysis

When clicking on a client in the Booked Events table, the wrong client page opens (e.g., clicking PRASANNA MAINALI at position 44 opens PABINA ADHIKARI at position 45).

### Root Cause

The navigation utility `client-navigation.ts` prioritizes `originalRowNumber` over `registeredDateTimeAD` when building the URL:

```typescript
// Current priority (problematic)
1. originalRowNumber  ← Uses row number that may be stale
2. rowNumber
3. registeredDateTimeAD  ← True unique identifier (safest)
```

The issue occurs because:
1. Booked clients use `originalRowNumber` which is resolved from CLIENT TRACKER at fetch time
2. If the CLIENT TRACKER cache is stale or rows shifted since the lookup, the row number no longer matches
3. The ClientDetail page then finds the wrong client at that row number

### Why +1 offset?

The off-by-one error likely occurs because:
- A new client was added to CLIENT TRACKER after the lookup was performed
- Or the cached data has a slightly different row index than the live sheet

## Solution

**Invert the navigation priority to use `registeredDateTimeAD` first** since it's the true unique identifier that never changes:

```typescript
// New priority (correct)
1. registeredDateTimeAD  ← Always correct (unique ID)
2. rowNumber             ← Fallback for older clients
3. originalRowNumber     ← Last resort
```

This ensures navigation always uses the stable unique identifier rather than position-based row numbers that can shift.

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/client-navigation.ts` | Invert priority: use `registeredDateTimeAD` first |

## Implementation Details

### `src/lib/client-navigation.ts`

Update `getClientNavigationId()` function:

```typescript
export function getClientNavigationId(
  client: ClientData | BookedClientData | { 
    originalRowNumber?: number; 
    rowNumber?: number; 
    registeredDateTimeAD?: string;
  }
): string {
  // Priority 1: Use registeredDateTimeAD (most reliable - true unique ID)
  if (client.registeredDateTimeAD) {
    return encodeURIComponent(client.registeredDateTimeAD);
  }
  
  // Priority 2: Use rowNumber if available (for regular clients without registeredDateTimeAD)
  if ('rowNumber' in client && client.rowNumber) {
    return String(client.rowNumber);
  }
  
  // Priority 3: Use originalRowNumber as last resort
  if ('originalRowNumber' in client && client.originalRowNumber) {
    return String(client.originalRowNumber);
  }
  
  console.warn('Client has no valid navigation ID:', client);
  return '';
}
```

## Why This Works

1. **`registeredDateTimeAD` is immutable**: It's set when the client is first registered and never changes
2. **ClientDetail already supports it**: The lookup logic (lines 270-283) already handles both row number and registeredDateTimeAD lookups
3. **URL-safe encoding**: `encodeURIComponent()` handles special characters in the datetime string
4. **Backward compatible**: Falls back to row numbers for any edge cases

## Testing Verification

After implementation:
1. Navigate to Booked Events page
2. Click on PRASANNA MAINALI (row 44)
3. Verify the Client Detail page shows PRASANNA MAINALI (not PABINA ADHIKARI)
4. Test navigation from other views (Fresh Clients, Search, etc.) to ensure they still work

---

### Technical Notes

- The `registeredDateTimeAD` format is typically `YYYY-MM-DDTHH:MM:SS.sssZ` which, when URL-encoded, becomes safe for use in routes
- The ClientDetail page's lookup logic at lines 277-279 handles decoding and matching by `registeredDateTimeAD`
- This fix applies globally to all navigation from any client list view
