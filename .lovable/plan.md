

## Redesigned Freelancer Hover Info — Enhanced Stats & Actions

### What Changes
Replace the current `FreelancerHoverInfo` component in `AllClientsCrewTable.tsx` with a cleaner, more informative layout.

### New Layout

```text
┌─────────────────────────────────┐
│  Freelancer Name        → profile│
├─────────────────────────────────┤
│  Total: 8  │ Remaining: 3 │ Done: 5│
│  (violet)    (amber)       (green) │
├─────────────────────────────────┤
│  Upcoming events list (if any)  │
├─────────────────────────────────┤
│  [Show only rows]  [WhatsApp]   │
│  [Send Schedule →]              │
└─────────────────────────────────┘
```

### Changes — `src/components/suite/AllClientsCrewTable.tsx`

**Rewrite `FreelancerHoverInfo` function (~lines 1798-1889)**

1. **Stats row**: Compute from `monthEvents`:
   - `total` = all events in selected month
   - `completed` = events where BS date is past (`isBSDatePast`)
   - `remaining` = total - completed
   - Display as 3 mini stat badges in a row: Total (violet), Remaining (amber), Completed (green)

2. **"Show only rows" button**: Already exists — keep as-is, style as outline button

3. **"Chat on WhatsApp" button**: New button that opens `wa.me/{phone}` without a message (just opens chat). Uses same freelancer phone lookup logic.

4. **"Send Schedule" button**: Keep existing logic but make it a Dialog/AlertDialog popup instead of direct send:
   - Click opens a small `Dialog` showing:
     - Freelancer name
     - Preview of the message text
     - "Send via WhatsApp" confirm button
     - "Cancel" button
   - This avoids accidental sends and gives a clean preview

5. **Clean UI**: Use proper spacing, dividers between sections, consistent button sizing

### Single file changed
- `src/components/suite/AllClientsCrewTable.tsx` (rewrite `FreelancerHoverInfo` ~90 lines)

