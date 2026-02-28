

# Fix Breaking News to Show All Recent Changes

## Root Cause

The Breaking News feed uses a **priority system** that's causing data loss:

1. If a client has `lastActivityLog` (Column AJ from Google Sheets), it ONLY shows activities from that column and **skips** parsing statusLog, comments, callLog, and payments entirely
2. When you make local changes (add comment, change status, log call, add payment), those updates go to the individual columns (statusLog, comments, callLog, paymentsMade) but **NOT** to `lastActivityLog`
3. Result: recent local changes are invisible in Breaking News because `lastActivityLog` takes priority and the fallback parsing is never reached

## Fix

### File 1: `src/lib/activity-utils.ts` -- `parseActivities()` function

**Change the logic from "priority/fallback" to "merge all sources":**

Currently (broken):
```
if (lastActivityLog exists) {
  use ONLY lastActivityLog  // <-- misses recent local changes
} else {
  parse statusLog, comments, callLog, payments
}
```

Fixed (merge everything):
```
// Always parse from ALL available sources
parse lastActivityLog entries (if any)
parse statusLog entries
parse commentActivities
parse callActivities  
parse paymentActivities (booked only)
parse clientAdded

// Deduplicate by content similarity (same client + same type + same timestamp window)
// Sort newest first
```

The deduplication will prevent double-entries where `lastActivityLog` and individual columns describe the same event. Two activities are considered duplicates if they share the same client ID, same type, and timestamps within 60 seconds of each other.

### File 2: `src/components/suite/ActivityCard.tsx` -- Better info display

Improve the card to show more useful information:
- Show the comment text preview for comment activities (currently says "New comment added" with details hidden)
- Show payment amount more prominently
- Show the actual status name for status changes
- Add a handler badge color variation per handler

### File 3: `src/hooks/useActivityFeed.ts` -- Increase limits

- Increase default limit from 100 to 200 to show more activities
- The 14-day window stays the same

## What This Fixes

- All recent local changes (status updates, comments, calls, payments) will immediately appear in Breaking News
- No more "only few are showing" -- every activity from every source gets included
- Better deduplication prevents double entries
- More informative cards with actual content previews

