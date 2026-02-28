

# Fix Recent Comments in Upcoming Events Section

## Problem

In `TodayEventsHero.tsx` (the Upcoming Events section on the suite homepage), line 420 picks the **oldest** comment instead of the **newest**:

```typescript
// Current (wrong) - gets LAST element = oldest comment
const lastComment = parsedComments[parsedComments.length - 1];
```

Since comments are now stored newest-first (after the format fix with `|||` delimiter), `parsedComments[0]` is the most recent comment, but the code grabs the last array element (oldest).

## Fix

### File: `src/components/suite/TodayEventsHero.tsx`

**Line 420** -- Change from:
```typescript
const lastComment = parsedComments.length > 0 ? parsedComments[parsedComments.length - 1] : null;
```
To:
```typescript
const lastComment = parsedComments.length > 0 ? parsedComments[0] : null;
```

This is a one-line fix. The `parseComments()` function returns comments in the order they appear in the string, and since `generateCommentEntry()` now prepends new comments, index 0 is always the newest.

