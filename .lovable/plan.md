
# Plan: Fix Comment Sync & Display in Upcoming Events

## Problem Summary

The user reports that after adding a comment via the plus button on an upcoming event card:
1. **Comment Not Showing**: The new comment doesn't appear on the card immediately
2. **Date Stamp Not Wanted**: The user only wants to see the comment text, not the timestamp

## Root Cause Analysis

There are **three issues** preventing comments from showing:

### Issue 1: Wrong Sheet Being Updated
The `addClientComment` API only updates the `CLIENT TRACKER` sheet (Column AC), but the `TodayEventsHero` component displays data from the `BOOKED CLIENTS` sheet. The `bookedRowNumber` passed to the API doesn't match the tracker row.

```text
TodayEventsHero.tsx passes:
  event.client.bookedRowNumber (row in BOOKED CLIENTS sheet)
  
addClientComment() updates:
  'CLIENT TRACKER'!AC${rowNumber} (wrong sheet!)
```

### Issue 2: No Optimistic Update
After adding a comment, the code calls `refreshData()` which fetches data from the API. However, there's no optimistic update to show the new comment immediately in the local state.

### Issue 3: Timestamp Display Not Wanted
The user wants to see only the comment text, not the date/time stamp.

---

## Solution

### Step 1: Create New Backend Action for Booked Comments

Add a new `addBookedClientComment` action to the edge function that:
- Updates Column AC in the **BOOKED CLIENTS** sheet
- Uses the `bookedRowNumber` correctly
- Also syncs the comment to `CLIENT TRACKER` for consistency

**File**: `supabase/functions/google-sheets/index.ts`

```typescript
// Add comment to BOOKED CLIENTS Column AC and sync to CLIENT TRACKER
async function addBookedClientComment(
  accessToken: string,
  spreadsheetId: string,
  bookedRowNumber: number,
  comment: string,
  existingComments: string,
  clientTimestamp: string,
  registeredDateTimeAD?: string
) {
  // 1. Update BOOKED CLIENTS sheet
  const newCommentEntry = `[${clientTimestamp}] ${comment}`;
  const updatedComments = existingComments 
    ? `${existingComments}|||${newCommentEntry}` 
    : newCommentEntry;

  // Update BOOKED CLIENTS sheet
  const bookedRange = encodeURIComponent(`'BOOKED CLIENTS'!AC${bookedRowNumber}`);
  await fetch(updateUrl, { method: 'PUT', body: updatedComments });

  // 2. Sync to CLIENT TRACKER if registeredDateTimeAD provided
  if (registeredDateTimeAD) {
    const trackerRow = await findTrackerRowByDateTime(registeredDateTimeAD);
    if (trackerRow) {
      // Update CLIENT TRACKER sheet too
    }
  }

  return { success: true, comments: updatedComments };
}
```

### Step 2: Add API Wrapper Function

**File**: `src/lib/sheets-api.ts`

```typescript
export async function addBookedClientComment(
  bookedRowNumber: number,
  comment: string,
  existingComments: string,
  registeredDateTimeAD?: string
): Promise<{ success: boolean; comments: string }> {
  const now = new Date();
  const clientTimestamp = `${month}/${day}/${year} ${hours}:${mins}`;
  
  return callSheetsFunction<{ success: boolean; comments: string }>("addBookedClientComment", {
    data: { bookedRowNumber, comment, existingComments, clientTimestamp, registeredDateTimeAD },
  });
}
```

### Step 3: Update TodayEventsHero Component

**File**: `src/components/suite/TodayEventsHero.tsx`

Changes:
1. Use the new `addBookedClientComment` API instead of `addClientComment`
2. Add optimistic update to show comment immediately
3. Remove timestamp display from the comment section
4. Pass `registeredDateTimeAD` for cross-sheet sync

```tsx
// Optimistic update after adding comment
const handleAddComment = async () => {
  const optimisticComment = newComment.trim();
  
  // Optimistically update local state
  setLocalComments(prev => ({
    ...prev,
    [selectedEventForComment.clientId]: optimisticComment
  }));
  
  await addBookedClientComment(
    selectedEventForComment.bookedRowNumber,
    optimisticComment,
    selectedEventForComment.existingComments,
    selectedEventForComment.registeredDateTimeAD
  );
  
  // Background refresh for full sync
  refreshData();
};
```

### Step 4: Remove Timestamp from Display

Update the comment display to show only text (no relative time):

```tsx
{/* Comment section - text only, no timestamp */}
{lastComment ? (
  <span className="text-xs text-gray-600 truncate flex-1">
    "{lastComment.text.length > 50 ? lastComment.text.slice(0, 50) + '...' : lastComment.text}"
  </span>
) : (
  <span className="text-xs text-gray-400 italic flex-1">No comments</span>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/google-sheets/index.ts` | Add `addBookedClientComment` function |
| `src/lib/sheets-api.ts` | Add API wrapper for new function |
| `src/components/suite/TodayEventsHero.tsx` | Use new API, add optimistic update, remove timestamp display |

---

## Technical Details

### Comment Storage Format
Comments are stored with timestamps: `[MM/DD/YYYY HH:MM] Comment text|||[MM/DD/YYYY HH:MM] Another comment`

The timestamp is still stored (for history purposes) but NOT displayed on the card.

### Cross-Sheet Sync
When adding a comment to BOOKED CLIENTS, we also sync to CLIENT TRACKER using the `registeredDateTimeAD` unique identifier to find the correct row.

### Optimistic Update Strategy
To ensure the comment appears instantly:
1. Show the new comment in local state immediately
2. Call the API in background
3. Trigger `refreshData()` to fully sync from server

---

## Edge Cases

- **No registeredDateTimeAD**: Skip tracker sync, update only booked sheet
- **API failure**: Revert optimistic update and show error toast
- **Empty comment**: Button disabled when input is empty
