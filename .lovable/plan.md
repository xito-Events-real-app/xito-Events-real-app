

## Fix: Benzo Keep Button Behavior in Suite Sidebar

### Current Issue
1. **Benzo Keep button** currently does nothing (no callback passed to `onOpenBenzoKeep`)
2. **Unassigned Benzo Keep button** works correctly - opens dialog with saved unassigned notes

### Correct Behavior (User's Expectation)

| Button | Action |
|--------|--------|
| **Benzo Keep** | Opens a **larger notepad dialog** where user writes a note, picks color, and has TWO options: "Save (Unassigned)" OR "Assign to Client" |
| **Unassigned Benzo Keep** | Opens dialog showing **previously saved unassigned notes**, with option to assign them to clients |

### Flow Diagram

```text
┌─────────────────────────────────────┐
│       Benzo Keep Button             │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│     Notepad Dialog (Larger)         │
│  ┌─────────────────────────────┐    │
│  │     Color Picker            │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │   Note Content Area         │    │
│  │   (min-height: 250px)       │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Cancel] [Save Unassigned] [Assign]│
└─────────────────────────────────────┘
               │
      ┌────────┴────────┐
      ▼                 ▼
  Save as           Assign to Client
  Unassigned        (Opens picker, 
  (Column AM)       saves to Column AL)
```

---

### Technical Changes

#### 1. Create New Component: `BenzoKeepNotepadDialog.tsx`

A new notepad dialog specifically for the Suite sidebar with:
- **Larger size**: `max-w-xl` with taller text area (`min-h-[250px]`)
- **Color picker** (5 colors)
- **Text area** with date auto-highlighting
- **Three buttons**:
  - Cancel
  - "Save Unassigned" → saves to Column AM (unassigned pool)
  - "Assign to Client" → opens client picker, saves to Column AL

#### 2. Update `SuiteBenzoKeepSection.tsx`

- Add state for `notepadOpen`
- Benzo Keep button opens the new notepad dialog
- Pass necessary handlers for saving

#### 3. Update Descriptions

| Button | Current Text | New Text |
|--------|--------------|----------|
| Benzo Keep | "Assigned notes" | "Write new note" |
| Unassigned | "Quick notes" | "View saved notes" |

---

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/suite/BenzoKeepNotepadDialog.tsx` | Notepad dialog with save/assign options |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/suite/SuiteBenzoKeepSection.tsx` | Add notepad dialog state, open on Benzo Keep click, update button descriptions |
| `src/components/suite/index.ts` | Export new component |

---

### UI Preview

**Benzo Keep Notepad Dialog**:
```text
┌──────────────────────────────────────────────┐
│  [X]  📒 Benzo Keep                          │
│                                              │
│  Color: [●] [●] [●] [●] [●]                  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │
│  │  Write your note here...               │  │
│  │                                        │  │
│  │  Dates like "January 15" will be       │  │
│  │  auto-highlighted                      │  │
│  │                                        │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  💡 Save unassigned or assign to a client   │
│                                              │
│  [Cancel]  [Save Unassigned]  [Assign →]    │
└──────────────────────────────────────────────┘
```

---

### Summary

- Create a new larger notepad dialog for writing notes
- Benzo Keep button opens this notepad
- User can either save as unassigned (goes to AM column pool) OR assign directly to a client
- Unassigned button still opens the list of saved unassigned notes
- Update button descriptions to clarify purpose

