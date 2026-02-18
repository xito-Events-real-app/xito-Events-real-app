
# Fix: Benzo Keep Notes Still Not Appearing on Client Page

## Root Cause (Confirmed)

The client detail page gets its data from a **3-layer cache**:
1. In-memory (fastest, served first — `memoryCache`)
2. Supabase `clients_cache` (medium)
3. Google Sheets (slowest, fallback)

When a note is assigned via Suite Notepad, the code correctly writes to:
- Google Sheets (via `assignBenzoKeepNoteToClient`)
- Supabase `clients_cache` (via `supabase.from('clients_cache').update(...)`)

But it **never updates the in-memory cache**. So when you navigate to the client detail page, `useCachedData` immediately returns the stale in-memory data that has no note. The note exists in Supabase but is never read because memory is checked first.

## The Fix

After successfully saving the note to Supabase `clients_cache`, the dialogs must dispatch a `cache-updated` window event with `type: 'clients-invalidate'`. This triggers `useCachedData` to invalidate its memory and re-read from Supabase, giving the client page the fresh note.

This event pattern is already used across the app (e.g., Master Sync, Auto Sync in `App.tsx`) — we just need to fire it after the Benzo Keep assignment.

## Changes

### File 1: `src/components/suite/BenzoKeepNotepadDialog.tsx`

In `handleSaveWithClient`, after the Supabase cache update succeeds, fire the invalidation event:

```typescript
window.dispatchEvent(new CustomEvent('cache-updated', {
  detail: { type: 'clients-invalidate' }
}));
```

This will cause `useCachedData` to call `refreshData()` which re-reads from Supabase `clients_cache` — picking up the newly stored note.

### File 2: `src/components/suite/AssignNoteDialog.tsx`

Same fix in `handleTransfer`, after the Supabase cache update succeeds:

```typescript
window.dispatchEvent(new CustomEvent('cache-updated', {
  detail: { type: 'clients-invalidate' }
}));
```

## Why This Works

The `useCachedData` hook has this listener:

```typescript
if (e.detail.type === 'clients-invalidate') {
  fetchState.hasRefreshed = false;
  refreshData(); // re-reads from Supabase clients_cache into memory
}
```

So firing the event forces a re-read from Supabase into memory. The next time the client detail page reads `currentKeepNotes`, it gets the fresh data with the note.

## Files Modified

| File | Change |
|---|---|
| `src/components/suite/BenzoKeepNotepadDialog.tsx` | Dispatch `clients-invalidate` event after Supabase update |
| `src/components/suite/AssignNoteDialog.tsx` | Dispatch `clients-invalidate` event after Supabase update |
