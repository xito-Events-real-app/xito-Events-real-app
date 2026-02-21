
# Fix: Upcoming Events Not Reflecting Updated Event Details Instantly

## Problem

When you update event details (venue, timing, parlour, etc.) from the Client Detail page and then navigate back to the Suite landing page, the "Upcoming Events" section shows stale/old data. This happens because the event details are served from a 5-minute browser cache that never gets cleared when updates happen.

## Solution

Two small changes to make the cache clear itself when event details are updated:

### 1. Clear the stale cache when event details are saved (useEventDetails.ts)

After successfully saving event details from the Client Detail page, dispatch a signal telling the rest of the app that event details have changed. This ensures any cached data is thrown away.

### 2. Listen for that signal and refetch fresh data (useBulkEventDetails.ts)

The Upcoming Events hook will listen for the "event details changed" signal. When it fires, it clears the 5-minute browser cache and re-fetches fresh data from the database, so the next time you visit the Suite page, you see updated information immediately.

---

## Technical Details

**File 1: `src/hooks/useEventDetails.ts`**
- In the `updateEventDetail` function, after a successful save, dispatch a `cache-updated` event with type `event-details-invalidate`.
- Also clear the `bulk_event_details_cache` sessionStorage entry directly for immediate effect.

**File 2: `src/hooks/useBulkEventDetails.ts`**
- Add a `window` event listener for `cache-updated` events where `type === 'event-details-invalidate'`.
- When received: clear the sessionStorage cache and re-fetch from Supabase `event_details_cache` table.
- Add a `refetch` counter state to trigger the `useEffect` to re-run.

No database changes. No new files. Two small edits to existing hooks.
