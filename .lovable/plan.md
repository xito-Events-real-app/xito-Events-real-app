

## Confirmation: Yes, That's Exactly Right

When you edit a client and remove an event (e.g., "beyond_true"):

1. **All Clients crew table**: The removed event's row will be **deleted** from `freelancer_assignments` → it disappears from All Clients
2. **Booked Clients**: The client itself stays — only the event row is removed, not the client record

### What's broken right now

The edit flow in `ClientDetail.tsx` and `QuickAdd.tsx` calls `getCurrentStatus()` to check if the client is BOOKED before running `ensureFreelancerAssignmentRows()` (which inserts missing events AND deletes orphans). But `getCurrentStatus` can't parse our new `BOOKED [03/04/2026, 17:45:30]` format, so it returns the wrong status → the cleanup never runs → orphan rows stay in All Clients.

### Fix (2 changes)

**File: `src/lib/client-card-utils.ts`** — Add Format 4 to `getCurrentStatus`

Inside the status parsing loop (~line 530), after the existing ISO bracket check, add recognition for the US-date bracket format:

```typescript
// Format 4: STATUS [MM/DD/YYYY, HH:mm:ss] (frontend bracket format)
if (!timestamp || isNaN(timestamp.getTime())) {
  const usBracketMatch = trimmed.match(
    /^(.+?)\s*\[(\d{1,2}\/\d{1,2}\/\d{4}),?\s*(\d{2}:\d{2}:\d{2})\]$/
  );
  if (usBracketMatch) {
    status = usBracketMatch[1].trim();
    const [m, d, y] = usBracketMatch[2].split('/');
    timestamp = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${usBracketMatch[3]}`);
  }
}
```

**File: `src/pages/ClientDetail.tsx`** — Add `ensureFreelancerAssignmentRows` call to the event watcher

The ClientDetail page already watches for event changes but doesn't clean up `freelancer_assignments`. Add the same orphan-cleanup logic that QuickAdd uses: when events change on a BOOKED client, call `ensureFreelancerAssignmentRows()` to insert new rows and delete removed ones, then dispatch `cache-updated` so All Clients refreshes.

### Result

- Edit client → remove "beyond_true" → `ensureFreelancerAssignmentRows` deletes the orphan assignment row → All Clients updates immediately
- Client stays in Booked Clients with remaining events intact
- All future event edits (add/remove) from any entry point will properly sync to All Clients

