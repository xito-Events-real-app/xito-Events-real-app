
# Plan: Add Handler Field to Client Edit Form

## Problem

When editing a client, the "Handler" field (`clientHandler`) is missing. The user correctly identified that:
- **"Added By"** (`whoAdded`) = Who registered the client (already editable)
- **"Handler"** (`clientHandler`) = Who is currently managing this client (missing from edit form)

The Handler is displayed in view mode but cannot be edited.

---

## Technical Changes

### File: `src/pages/ClientDetail.tsx`

**1. Add state variable for clientHandler**

Around line 142 (after `whoAdded` state):
```typescript
const [whoAdded, setWhoAdded] = useState("");
const [clientHandler, setClientHandler] = useState("");  // ADD THIS
```

**2. Initialize handler in handleEdit function**

Around line 375 (in `handleEdit` function):
```typescript
setWhoAdded(client.whoAdded || '');
setClientHandler(client.clientHandler || '');  // ADD THIS
```

**3. Add Handler field to edit form**

After the "Added By" `FormSelect` (around line 871), add:
```tsx
<FormSelect 
  label="Added By" 
  value={whoAdded} 
  onChange={setWhoAdded} 
  options={dropdowns?.whatsappOwners || []} 
  placeholder="Who added this client?" 
/>
{/* ADD THIS - Handler field */}
<FormSelect 
  label="Handler" 
  value={clientHandler} 
  onChange={setClientHandler} 
  options={dropdowns?.whatsappOwners || []} 
  placeholder="Who is handling this client?" 
/>
```

**4. Include handler in updatedClient object**

In `handleSave` (around line 499):
```typescript
const updatedClient: ClientData = {
  ...editedClient,
  // ... existing fields
  whoAdded,
  clientHandler,  // ADD THIS
  description: descriptionInput,
  // ... rest
};
```

**5. Reset handler in resetFormState**

Around line 406:
```typescript
setWhoAdded("");
setClientHandler("");  // ADD THIS
```

---

## Summary of Changes

| Location | Change |
|----------|--------|
| Line ~142 | Add `const [clientHandler, setClientHandler] = useState("");` |
| Line ~375 | Add `setClientHandler(client.clientHandler \|\| '');` in handleEdit |
| Line ~406 | Add `setClientHandler("");` in resetFormState |
| Line ~499 | Add `clientHandler,` to updatedClient object |
| Line ~871 | Add Handler `FormSelect` in edit form UI |

---

## Visual Result

The edit form will now show both fields:

```text
┌─────────────────────────────────────┐
│ Client Basic Details                │
├─────────────────────────────────────┤
│ Client Name: [FUNNY BHUSAN      ]   │
│ Source:      [INSTAGRAM         ▼]  │
│ Added By:    [BENZO             ▼]  │
│ Handler:     [BENZO             ▼]  │  ← NEW FIELD
└─────────────────────────────────────┘
```

Both fields use the same `whatsappOwners` dropdown options (BENZO, BARUN, NIKIT) since these are the team members who can add clients and handle them.
