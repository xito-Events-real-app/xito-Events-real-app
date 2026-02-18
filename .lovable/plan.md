
# Fix: Benzo Keep Notes Are Being Appended (Duplicated) Instead of Replaced

## Root Cause: Two Backend Functions "Merge" Instead of "Overwrite"

Both backend functions that write Benzo Keep notes to Google Sheets have a **"merge/append" design** instead of a "replace" design. This is the direct cause of duplication.

### Bug 1: `assignBenzoKeepNoteToClient` (lines 864-868)

This function is called when you select a client in the Suite Notepad and click "Assign". It reads the **existing** content from Column AL, then **appends** the new note to it:

```typescript
// Current BROKEN behavior:
const mergedContent = existingContent 
  ? `${existingContent}\n\n--- New Note (${new Date().toLocaleDateString()}) ---\n${newNoteData.content}`
  : newNoteData.content;  // ← APPENDS old + new content
```

So if a client already has a note, the new note gets pasted below the old one, separated by a `--- New Note ---` divider. Both the old note AND the new note are now stored as one combined blob.

When the client page renders this blob, it shows everything — old content, divider, new content — all as one note. This is why you see what looks like "two notes".

### Bug 2: `transferBenzoKeepNote` (lines 501-514)

Same problem in the unassigned note transfer function:

```typescript
// Current BROKEN behavior:
if (clientNotes?.content) {
  newContent = `${clientNotes.content}\n\n--- Transferred Note (${new Date().toLocaleDateString()}) ---\n${noteToTransfer.content}`;
}
// ← Also APPENDS, does not REPLACE
```

## Why The "Merge" Design Was Wrong

A Benzo Keep note for a client is meant to be a **single living document** — like a sticky note on a file. When you edit and re-assign it, you want it to **replace** what was there. The merge logic treats every assignment as "adding a new section", which is completely wrong for this use case.

The correct behavior: when you assign/re-assign a note to a client, the new content **replaces** the old content entirely. The `lastUpdated` timestamp already tracks when it changed.

## The Fix

### In `supabase/functions/google-sheets/index.ts`

**Fix 1: `assignBenzoKeepNoteToClient`** — Remove the merge/append logic. Instead of reading existing content and appending, simply write the new note directly. Delete the "get existing notes" fetch and the `mergedContent` construction:

```typescript
// NEW behavior: Direct replace
const finalNotes = {
  content: newNoteData.content,  // Use new content directly
  markerColor: newNoteData.markerColor,
  lastUpdated: now,
};
```

**Fix 2: `transferBenzoKeepNote`** — Same fix. Remove the "merge with existing" logic. The transferred note content replaces whatever was there:

```typescript
// NEW behavior: Direct replace
const mergedNotes = {
  content: noteToTransfer.content,  // Use transferred content directly
  markerColor: noteToTransfer.markerColor,
  lastUpdated: now,
};
```

## Impact

- When you write a note in Benzo Keep and assign it to a client → their Column AL is **overwritten** with exactly what you wrote. Clean, single note.
- When you re-open the client in Benzo Keep and edit their note → the new version **replaces** the old version completely. No dividers, no appended sections.
- When you transfer an unassigned note to a client → the transferred content **replaces** their current note. Clean single note.
- The Supabase `clients_cache` update (which writes `benzo_keep_notes` directly) was already doing a replace — so that part was always correct. Now the Google Sheets backend will match.

## Cleanup for Existing Duplicated Notes

Any notes that are already duplicated (like Shyam Poudel's) will need to be manually fixed by editing them in Benzo Keep — write the clean version and save. There is no automated cleanup needed for the data since the column is a single free-text field.

## Files Modified

| File | Change |
|---|---|
| `supabase/functions/google-sheets/index.ts` | Fix `assignBenzoKeepNoteToClient`: remove existing-content fetch and merge logic, write new note directly |
| `supabase/functions/google-sheets/index.ts` | Fix `transferBenzoKeepNote`: remove merge-with-existing logic, write transferred note directly |
