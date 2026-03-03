

# Fix: Breaking News Not Updating After Comment Addition

## Root Cause (Confirmed)

In `TodayEventsHero.tsx`, `handleAddComment` (line 240) calls `addBookedClientComment()` which writes to Google Sheets and returns `{ success, comments }`. However, the returned canonical `comments` string is **never written back to the local Supabase cache**. The only follow-up is `refreshData()` which re-reads from Supabase -- but Supabase was never updated with the new comment. So the Breaking News feed (which parses `comments` from cached client data) sees stale/empty data.

The previous fix to `clients-supabase-cache.ts` (broadcasting `cache-updated` events) was correct infrastructure, but **nothing calls `updateClientFieldInCache`** for comments added from this flow.

## Changes

### 1. `src/components/suite/TodayEventsHero.tsx` — Write to cache after comment success

After `addBookedClientComment` returns successfully:
- Capture the returned `comments` string (canonical server value).
- Call `updateClientFieldInCache(registeredDateTimeAD, 'comments', result.comments)`.
- This function already updates memory singletons and broadcasts `cache-updated` events (from the previous fix), so Breaking News will pick it up instantly.
- Remove reliance on `refreshData()` as the primary sync path (keep as optional background).

```typescript
// Line ~254, replace the try block:
const result = await addBookedClientComment(
  selectedEventForComment.bookedRowNumber,
  optimisticComment,
  selectedEventForComment.existingComments,
  selectedEventForComment.registeredDateTimeAD
);

// Immediately sync to local cache → triggers Breaking News update
if (result.comments && selectedEventForComment.registeredDateTimeAD) {
  await updateClientFieldInCache(
    selectedEventForComment.registeredDateTimeAD,
    'comments',
    result.comments
  );
}

setNewComment('');
setCommentDrawerOpen(false);
toast.success('Comment added');
```

Import: add `import { updateClientFieldInCache } from "@/lib/clients-supabase-cache";`

### 2. `src/lib/activity-utils.ts` — Fix comment deduplication

Current dedup (line 432-435) merges same `clientId + type` within 60 seconds. Two different comments posted quickly get collapsed.

Change the dedup check for comments to include the description text:

```typescript
// Line 432-435, update condition:
const isDuplicate = result.some(existing => 
  existing.clientId === activity.clientId &&
  existing.type === activity.type &&
  (activity.type === 'comment' 
    ? existing.description === activity.description  // exact text match for comments
    : Math.abs(existing.timestamp.getTime() - activity.timestamp.getTime()) < 60000
  )
);
```

This ensures distinct comments are never collapsed, while other activity types retain the time-window dedup.

## Impact Analysis

| Risk | Level | Safeguard |
|------|-------|-----------|
| Breaking `useActivityFeed` | None | No hook API changes; only data freshness improves |
| Infinite re-renders in `TodayEventsHero` | None | `updateClientFieldInCache` is called once in an async handler, not in a render or effect |
| Desyncing `clients_cache` from Sheets | None | `updateClientFieldInCache` already sets `synced_to_sheet=false` and schedules a push, maintaining the three-layer write contract |

## Files Changed
1. `src/components/suite/TodayEventsHero.tsx` — add cache write after comment success
2. `src/lib/activity-utils.ts` — refine dedup for comment type

