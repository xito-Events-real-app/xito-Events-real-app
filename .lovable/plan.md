

# Update Benzo Keep: "Save" Button for Existing Clients + Reflect Notes on Client Page

## What Changes

When you select an **existing client** in Benzo Keep (one who already has `benzoKeepNotes`), the green button currently says "Assign to [Client Name]". It should instead say **"Save to [Client Name]"** since you're updating, not assigning for the first time. The "Save Unassigned" button should also be hidden in this case since the note is already linked to a client.

Additionally, after saving, the updated note must reflect immediately on the client's detail page in the Benzo Keep viewer section -- this requires updating the memory cache and dispatching the cache event so the client detail page picks up the change without a reload.

## Changes to Make

### File: `src/components/suite/BenzoKeepNotepadDialog.tsx`

**1. Update button label logic (around line 285-290)**

Add a check: if `selectedClient` already has `benzoKeepNotes`, treat it as an "update" flow:

```typescript
const isUpdatingExistingNote = selectedClient && selectedClient.benzoKeepNotes;

const assignButtonLabel = selectedClient
  ? isUpdatingExistingNote
    ? `Save to ${selectedClient.clientName}`
    : `Assign to ${selectedClient.clientName}`
  : quickClientData.clientName.trim()
    ? `Create "${quickClientData.clientName}" + Assign`
    : "Assign to Client";
```

**2. Change the button icon for update mode**

When updating an existing client's note, show a save icon instead of `UserPlus`:

```typescript
{isSaving ? <Loader2 /> : isUpdatingExistingNote ? <StickyNote /> : <UserPlus />}
```

**3. Hide "Save Unassigned" when an existing client is selected**

When the user has selected an existing client, the "Save Unassigned" button is irrelevant -- conditionally hide it.

**4. Update memory cache in the "existing client save" path (lines 160-200)**

The current code updates the database and Sheets but does NOT update the in-memory cache. Add after the Supabase update succeeds:

```typescript
// Update memory cache so client detail page reflects the change
const memClients = getMemoryClients();
if (memClients) {
  setMemoryClients(memClients.map(c =>
    c.registeredDateTimeAD === selectedClient.registeredDateTimeAD
      ? { ...c, benzoKeepNotes: noteJson }
      : c
  ));
}
notifyCacheUpdate('clients');
```

This ensures that when you navigate to the client's detail page after saving, the `BenzoKeepViewer` component will immediately show the updated note content without needing a page reload or re-sync.

## Files to Change

1. **`src/components/suite/BenzoKeepNotepadDialog.tsx`** -- button label, icon, visibility logic, and memory cache update on existing client save

No other files need changes -- the `BenzoKeepViewer` on the client detail page already reads from the cached client data and will pick up the updated `benzoKeepNotes` field automatically.
