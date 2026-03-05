

## Plan: Fix Card Deletion Bugs in FilePathBuilderDialog

### Issues
1. Card 1 can be deleted — this removes the base freelancer file record, making the freelancer disappear from the files table
2. Cards are hard-deleted (`supabase.delete()`) instead of soft-deleted (`deleted_or_not = true`), bypassing the system's soft-delete pattern
3. `onRefresh()` is called after card removal, causing a full page refresh

### Changes to `src/components/files/FilePathBuilderDialog.tsx`

**1. Prevent Card 1 deletion (line 281)**
- Add guard: `if (cardNumber === "1") return` at the top of `handleRemoveCard`
- Card 1 is the base record and must never be removed

**2. Hide delete button for Card 1 in both desktop and mobile card tabs**
- Desktop (line 575-583): Only render the Trash2 button when `key !== "1"`
- Mobile (line 797-805): Same — only render when `key !== "1"`

**3. Use soft-delete instead of hard delete (line 295)**
- Replace `.delete().eq("id", cardFile.id)` with `.update({ deleted_or_not: true, synced_to_sheet: false }).eq("id", cardFile.id)`
- This matches the pattern used by `deleteFileRecord` in `files-api.ts`

**4. Remove `onRefresh()` call from `handleRemoveCard` (line 307)**
- Same fix pattern as `handleAddCard` — prevents page refresh
- UI state is already updated locally (cardForms, cardCount, activeCard)

