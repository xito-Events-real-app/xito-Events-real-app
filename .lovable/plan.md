
# Fix: Event Details Writing to Wrong Event Line in Google Sheets

## Problem
When saving venue details for a specific event (e.g., BRATABANDHA PARTY), the data sometimes lands on a different event's line (e.g., NUWAKOT BHOJ SHOOT) in the Google Sheet. The app shows correct data because it re-reads using the same indexing logic, but the sheet has the data visually on the wrong line.

## Root Cause
The `updateClientEventDetails` backend function uses `eventIndex` (a line number within multi-line cells) to decide WHERE to write data, but it never verifies that the line at that index actually corresponds to the intended event. If events are reordered, or if there's an empty line gap, or if the index from the Supabase cache is stale, the write targets the wrong line.

## Solution: Add Event Name Verification Before Writing

### File: `supabase/functions/google-sheets/index.ts`

**Change 1: Verify eventIndex matches the correct event name**

In the `updateClientEventDetails` function (around line 4885), after finding the row and reading existing data, add a verification step:

1. Read Column D (event names, index 3) and split by newline
2. Check that the event name at `eventIndex` matches the expected event name (passed as a new parameter)
3. If it doesn't match, search the event names array for the correct index
4. Use the corrected index for writing

This requires:
- Adding an optional `eventName` parameter to `updateClientEventDetails`
- The frontend already knows the event name, so it can pass it along
- If the name at `eventIndex` doesn't match, scan all lines to find the correct one
- Log a warning when a mismatch is detected (for debugging)

**Change 2: Pass event name from the frontend hook**

In `src/hooks/useEventDetails.ts`, when calling `updateClientEventDetails`, include the event name in the request so the backend can verify it.

**Change 3: Update the edge function handler**

In the edge function's switch case for `updateClientEventDetails`, forward the `eventName` parameter.

---

## Technical Details

### Backend changes (`supabase/functions/google-sheets/index.ts`)

In `updateClientEventDetails` (line ~4885), after reading the existing row:

```text
// After finding the row, verify eventIndex matches the expected event
const eventNames = (existingRow[3] || '').split('\n');
let verifiedEventIndex = eventIndex;

if (updates._eventName) {
  const expectedName = updates._eventName.trim().toUpperCase();
  const currentName = (eventNames[eventIndex] || '').trim().toUpperCase();
  
  if (currentName !== expectedName) {
    // Event index mismatch - find the correct one
    console.warn(`[EVENT INDEX MISMATCH] Expected "${expectedName}" at index ${eventIndex}, found "${currentName}". Searching...`);
    
    const correctIndex = eventNames.findIndex(
      n => n.trim().toUpperCase() === expectedName
    );
    
    if (correctIndex >= 0) {
      verifiedEventIndex = correctIndex;
      console.log(`[EVENT INDEX MISMATCH] Found correct index: ${correctIndex}`);
    } else {
      console.error(`[EVENT INDEX MISMATCH] Event "${expectedName}" not found in any line`);
    }
  }
  
  // Remove internal field before processing
  delete updates._eventName;
}
```

Then use `verifiedEventIndex` instead of `eventIndex` in all `updateLineAtIndex` calls.

### Frontend changes (`src/hooks/useEventDetails.ts`)

In `updateEventDetail`, include the event name when calling the edge function:

```text
// Find the event name for verification
const currentEvent = data?.events.find(e => e.eventIndex === eventIndex);

const { data: result, error: updateError } = await supabase.functions.invoke('google-sheets', {
  body: {
    action: 'updateClientEventDetails',
    data: { 
      registeredDateTimeAD,
      eventIndex,
      updates: {
        ...processedUpdates,
        _eventName: currentEvent?.eventName || ''
      }
    }
  }
});
```

### Edge function handler (line ~7550)

No changes needed -- the `updates` object already passes through as `data.updates`.

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/google-sheets/index.ts` | Add event name verification in `updateClientEventDetails` -- find correct line index if mismatch detected |
| `src/hooks/useEventDetails.ts` | Pass `_eventName` in the updates payload for backend verification |

This is a safety net that will:
- Prevent venue data from landing on the wrong event line
- Log warnings when mismatches are detected (helps future debugging)
- Self-correct by searching for the correct event name if the index is wrong
