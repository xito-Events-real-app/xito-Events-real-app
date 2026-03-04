

## Plan: Add Self-Update Guard to Prevent Refresh Flash

### Problem
Every local update (backup, cloud, notes) triggers a realtime event which calls `loadFiles()` — causing a full refetch and visible UI flash. The optimistic state is already correct but gets overwritten.

### Solution
Add a `useRef` timestamp guard (same pattern used in other hooks per project conventions). Skip realtime refetches that arrive within 2 seconds of a local update.

### Changes

**`src/hooks/useFilesManagement.ts`**:
1. Add `import { useRef }` 
2. Add `const lastLocalUpdate = useRef<number>(0)`
3. In `update()` and `remove()`: set `lastLocalUpdate.current = Date.now()` before the optimistic state update
4. In the realtime callback (line 66-68): add guard `if (Date.now() - lastLocalUpdate.current < 2000) return;` before calling `loadFiles()`

This preserves realtime sync for external changes while preventing the flash from self-triggered events.

### Files to modify
1. `src/hooks/useFilesManagement.ts` — 4 small edits

