

## Fix: Breaking News Not Showing Newly Added Booked Clients

### Root Cause

In `DesktopSuiteLanding.tsx`, the "Refresh News" button fires two cache invalidation calls back-to-back (lines 28-29):

```
notifyCacheUpdate('clients-invalidate');    // <-- gets CANCELED by debounce
notifyCacheUpdate('booked-clients-invalidate');  // <-- only this one fires
```

The global `notifyCacheUpdate` function uses a **shared 100ms debounce timer**. When both calls happen within microseconds, the second call cancels the first. Since the first call (`clients-invalidate`) is canceled, the Client Tracker cache never refreshes. And critically, the second call (`booked-clients-invalidate`) does fire -- but the issue is that the **activity feed** depends on BOTH caches being fresh to show all activities.

The `HandlerActivitySection` component already has the correct fix with a 150ms stagger. The landing page refresh button just needs the same treatment.

### Fix

**File: `src/components/suite/DesktopSuiteLanding.tsx`**

Stagger the two invalidation calls by 200ms so both survive the debounce:

```typescript
const handleRefreshNews = async () => {
  setIsRefreshing(true);
  try {
    notifyCacheUpdate('clients-invalidate');
    setTimeout(() => {
      notifyCacheUpdate('booked-clients-invalidate');
    }, 200);
    toast.success("News refreshed!");
  } catch (error) {
    toast.error("Failed to refresh news");
  } finally {
    setTimeout(() => setIsRefreshing(false), 2000);
  }
};
```

This is a one-line change -- wrap the second call in a `setTimeout` with 200ms delay. This matches the pattern already used elsewhere in the codebase.

