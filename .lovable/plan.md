

# Fix: Duplicate Event Name Collision in All Clients Crew Table

## Problem
When two events share the same name (e.g., two "PRE+RECEPTION" events on different dates), changing the required crew categories or assigning a freelancer on one event also changes the other. This happens because the local state update uses only `registeredDateTimeAD + event` to match rows, which is not unique when event names repeat.

## Root Cause
In `AllClientsCrewTable.tsx`, every `setAssignments(prev => prev.map(...))` call matches rows like this:

```text
a.registeredDateTimeAD === row.registeredDateTimeAD && a.event === row.event
```

This matches **all** events with the same name for the same client. The fix is to add `a.eventDateAD === row.eventDateAD` to form a proper composite key, which is already how the Supabase upsert works (the unique constraint is on `registered_date_time_ad, event, event_date_ad`).

## Fix (1 file, ~15 occurrences)

**File:** `src/components/suite/AllClientsCrewTable.tsx`

Change every occurrence of:
```typescript
a.registeredDateTimeAD === row.registeredDateTimeAD && a.event === row.event
```
to:
```typescript
a.registeredDateTimeAD === row.registeredDateTimeAD && a.event === row.event && a.eventDateAD === row.eventDateAD
```

There are approximately 15 instances across three interaction types:
1. **Crew member assignment** (handleAssign around line 434)
2. **Required categories update** (desktop view around line 1103)
3. **Required categories update** (mobile view around line 1252)

The Supabase writes are already correct (they pass `row.eventDateAD`), so this is purely a local state update bug -- the database has the right data, but the UI updates both rows visually.

## No Other Files Affected
- `useFreelancerAssignments.ts` already uses `eventDateAD` in its match (line 64)
- `FreelancerAssignmentSection.tsx` passes `assignment.eventDateAD` correctly
- The Supabase `updateAssignmentInCache` and `updateCategoriesInCache` both use `event_date_ad` in their upsert conflict key

