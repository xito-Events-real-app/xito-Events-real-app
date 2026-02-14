

# Fix: Sync Button Blocked by Background Sync

## Problem

The approved fix from the previous plan was not applied. Line 130 still reads:

```typescript
if (syncingRef.current) return;
```

This blocks ALL sync calls -- including user clicks -- whenever the silent mount sync (line 167) or 30-minute interval sync (line 170) is running. Since the mount sync takes 20-30 seconds, any click during that window is silently ignored.

## Fix

### File: `src/components/suite/AllClientsCrewTable.tsx`

**Single line change at line 130:**

Change:
```typescript
if (syncingRef.current) return;
```

To:
```typescript
if (silent && syncingRef.current) return;
```

This means:
- User clicks (`silent = false`) always proceed and show "Syncing..." feedback
- Background syncs (`silent = true`) are still guarded against piling up
- No data corruption risk since all sync operations have built-in deduplication

## Files to Modify

1. `src/components/suite/AllClientsCrewTable.tsx` -- line 130 (1 line change)

