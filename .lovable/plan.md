

# Fix: "Sync Clients" Button Always Clickable

## Problem

The "Sync Clients" button in the All Clients Crew Table is disabled when `isBusy.current` is true. Since `isBusy` is a `useRef`, its value doesn't trigger re-renders, so the button can stay visually disabled even after the operation finishes (until something else causes a re-render). Additionally, the `isBusy` guard prevents clicking during background syncs or upload/restore operations.

## Fix

### File: `src/components/suite/AllClientsCrewTable.tsx`

**Change 1 -- Remove `isBusy.current` from the disabled prop (line 385)**

Change:
```tsx
disabled={syncing || isBusy.current}
```
To:
```tsx
disabled={syncing}
```

This ensures the button is only disabled while its own sync operation is actively running (with visual "Syncing..." feedback), and is always available to click otherwise.

**Change 2 -- Remove the `isBusy` guard from `handleSync` (lines 128-131)**

Remove the early return that blocks syncing when another operation is running. The button should always trigger a sync when clicked. The `syncing` state already prevents double-clicks on the same button.

Change:
```typescript
const handleSync = useCallback(async (silent = false) => {
  if (isBusy.current) {
    if (!silent) toast.info("Another sync is already running, please wait");
    return;
  }
  isBusy.current = true;
  if (!silent) setSyncing(true);
```
To:
```typescript
const handleSync = useCallback(async (silent = false) => {
  if (syncing) return; // Only prevent double-clicks on same button
  if (!silent) setSyncing(true);
```

The `isBusy` ref will remain for the `handleUploadRestore` function where concurrency protection is still useful, but it will no longer block manual sync requests.

## Result

- "Sync Clients" button is always clickable (only disabled during its own active sync with "Syncing..." text)
- Background syncs and upload/restore operations no longer block manual sync
- Upload/restore still has its own concurrency guard via `isBusy`

