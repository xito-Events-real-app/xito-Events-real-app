

## Add Card Switcher at Top + Card Removal

### Changes to `src/components/files/FilePathBuilderDialog.tsx`

**1. Top-level Card Switcher (above backup indicator, line ~428)**
Add a tab bar / switch row at the very top of the dialog body (before the backup indicator) showing Card 1, Card 2, etc. Selecting one switches `activeCard` so all fields below reflect that card's data. Styled as prominent pill buttons spanning full width.

**2. Card Removal**
- Add a small "Remove" / trash button next to each card tab (both in the top switcher and in the Column 2 card section)
- On remove: delete the corresponding `files_management` row from DB via supabase, remove from `cardForms` state, adjust `cardCount`, switch `activeCard` to remaining card
- Allow removing any card (card 1 or card 2), not just the last one — cards can exist independently

**3. Logic additions**
- New `handleRemoveCard(cardNumber)` function:
  - Find the file row in `allFiles` matching this freelancer + event + card_label
  - Delete it from DB
  - Remove from `cardForms`
  - Decrement `cardCount` or recalculate from remaining cards
  - Switch `activeCard` to another existing card
  - Call `onRefresh()`
- Confirmation toast before deletion

**4. Layout structure (top to bottom)**
```
┌─────────────────────────────────────────┐
│  [Card 1] [Card 2] [+ Add]             │  ← NEW top switcher with remove buttons
├─────────────────────────────────────────┤
│  Setting 1st Backup                     │  ← existing backup indicator
├─────────────────────────────────────────┤
│  CARD 1 — CLIENT — EVENT — FREELANCER   │  ← existing header
├─────────────────────────────────────────┤
│  Col1: Storage   Col2: Info   Col3: Meta│  ← existing 3-col grid
└─────────────────────────────────────────┘
```

**5. Column 2 card section stays as-is** — keeps showing card count badge and the tab triggers, but also gets a remove button per card.

### Files changed
Single file: `src/components/files/FilePathBuilderDialog.tsx`

