

## Plan: Fix Card Addition Resetting Form Data

### Root Cause
In `handleAddCard` (line 271-276), after creating the duplicate row in the database, it calls `onRefresh()`. This triggers the parent to reload `allFiles`, which changes the `allFiles` prop, which triggers the `useEffect` on line 117 (dependencies: `[fileRecord, open, allFiles]`) — that effect **resets all form state**, wiping out whatever the user entered for Card 1.

### Fix in `src/components/files/FilePathBuilderDialog.tsx`

**1. Remove `onRefresh()` from `handleAddCard`** (lines 273-274)
- The DB row is created but the parent data reload is deferred until `handleSave` or dialog close
- This prevents the reset useEffect from firing mid-editing

**2. Remove `allFiles` from the reset useEffect dependencies** (line 179)
- Change `[fileRecord, open, allFiles]` → `[fileRecord, open]`
- The effect only needs to run when the dialog opens with a new file record, not when background data changes
- Card forms for other cards are loaded from `allFiles` inside the effect body (reading current value), but shouldn't re-trigger on every allFiles change

These two changes ensure the form state persists while users work across multiple cards.

