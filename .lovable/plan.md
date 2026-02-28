

# Fix Comment System in Client Page + Show Recent Comment in Upcoming Events

## Problems Found

### 1. Comment Format Mismatch (Root Cause)
The `generateCommentEntry()` function in `timestamp-utils.ts` creates comments in a format that `parseComments()` in `client-card-utils.ts` cannot parse:

```text
generateCommentEntry output:  "02/28/2026 10:15 - my comment\nold comment"
                               ^^^ newline separator, dash format

parseComments expects:         "my comment [02/28/2026 10:15]|||old comment"
                               ^^^ triple-pipe separator, bracket timestamp
```

This means after adding a comment optimistically (before the backend returns), the comment appears as raw unparsed text. It only works correctly after a page refresh (when the backend-formatted string replaces the local one).

### 2. Comments Tab Disorganized
The "Comments" sidebar tab in the client detail page shows comments oldest-first (no reverse), and the `ChatComments` component used in the hero section reverses but also tries to scroll-to-bottom, which conflicts with newest-first ordering.

### 3. Upcoming Events Already Shows Comments
The `TodayEventsHero` component already parses and shows the last comment on each event card (line 420). But because of the format mismatch above, newly added comments from the drawer may not display correctly until the backend returns the properly formatted string.

## Fix Plan

### File 1: `src/lib/timestamp-utils.ts`
Fix `generateCommentEntry()` to match the format that `parseComments()` expects:
- Change delimiter from `\n` to `|||`
- Change timestamp format from `MM/DD/YYYY HH:MM - comment` to `comment [MM/DD/YYYY HH:MM]`

```typescript
export function generateCommentEntry(comment: string, existingComments: string): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  const timestamp = `${month}/${day}/${year} ${hours}:${mins}`;

  const newEntry = `${comment} [${timestamp}]`;
  return existingComments ? `${newEntry}|||${existingComments}` : newEntry;
}
```

### File 2: `src/components/client-detail/ChatComments.tsx`
- Remove `.reverse()` since comments are already newest-first from the parser
- Change scroll behavior to scroll-to-top (newest at top)
- Always show the input (remove the hidden toggle -- make it always visible at the bottom like a real chat)

### File 3: `src/pages/ClientDetail.tsx` (Comments tab)
- Show comments newest-first (reverse the `parsedComments` array in the display)
- The comment input and display are already fine structurally

### File 4: `src/components/client-detail/QuotationDisplaySection.tsx`
- Same fix for `InlineComments` -- remove `.reverse()` since data is already newest-first

### File 5: No changes needed for Upcoming Events
The `TodayEventsHero` already shows the last comment on each event card. Once the format mismatch is fixed (File 1), newly added comments will parse and display correctly in the upcoming events section too.

## What This Fixes
- Comments added from anywhere (client page, fresh client card, desktop row, upcoming events drawer) will immediately display correctly with proper timestamp parsing
- Newest comments always appear at the top
- The comment input is always accessible without needing to click a "+" button first
- Upcoming events cards will correctly show the most recent comment after adding one

