
# "Auto-Fill Required Categories" Button on Client Detail Page

## What It Does

Adds a button at the top of the **Event Details** section that, with one click, scans all events for this client and sets the required categories to **only the roles that already have a freelancer assigned**. All empty/unassigned roles become "Not Required" (black cells in All Clients table).

This gives you manual control: assign the freelancers you want first, then click the button to lock down the remaining empty slots as "Not Required."

## UI Placement

In the Event Details section header (line ~1072), next to the client name and handler badge, add a button labeled **"Lock Empty Slots"** (or similar) with a `UserCog` icon. Clicking it:

1. Loops through all freelancer assignments for this client
2. For each event, checks which of the 10 role fields (PB, PG, VB, etc.) have a freelancer name filled in
3. Sets `requiredCategories` to only those filled codes
4. Saves all events to Column AA via `updateRequiredCrewCategories`
5. Refetches data so the UI updates immediately

## Technical Changes

### 1. `src/pages/ClientDetail.tsx`

- Add a new handler function `handleLockEmptySlots`:
  ```
  For each freelancerAssignment row:
    - Check fields: photographerBride, photographerGroom, etc.
    - Collect codes where the field is non-empty (e.g., "PB,VG,Drone")
    - Call updateRequiredCrewCategories for that event
  Refetch assignments after all updates
  Show toast confirmation
  ```

- Add the button in the Events section header bar (line ~1072), next to the handler badge:
  ```
  <Button size="sm" onClick={handleLockEmptySlots}>
    <UserCog /> Lock Empty Slots
  </Button>
  ```

- The button should show a loading spinner while processing and be disabled during the operation.

### 2. No other files need changes

The existing `updateRequiredCrewCategories` API function and the existing UI components (CrewCategorySelector, black cells in All Clients) already handle the downstream effects. Once Column AA is updated, everything flows automatically.

## Files to Modify

1. **`src/pages/ClientDetail.tsx`** -- Add handler function and button in Events section header
