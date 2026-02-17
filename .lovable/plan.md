

# Fix: Benzo Keep Notes Not Showing on Client Page After Assignment

## Problem

When you write a Benzo Keep note from the **Suite Notepad** and assign it to a client (or transfer an unassigned note to a client), the note saves to Google Sheets successfully but does NOT appear in the Benzo Keep section on the client's detail page.

## Root Cause

The `assignBenzoKeepNoteToClient` and `transferBenzoKeepNote` functions only write to Google Sheets (Column AL). They do **not** update the `clients_cache` table in the database, which is where the client detail page reads data from. So the page shows stale/empty notes.

Notes saved from the client detail page's own "Edit" button work fine because that path updates both the database cache and Google Sheets.

## Fix

After successfully writing to Google Sheets, also update the `clients_cache.benzo_keep_notes` column in the database so the client page reflects the change immediately.

### File 1: `src/components/suite/BenzoKeepNotepadDialog.tsx`

In `handleSaveWithClient` (line 168), after `assignBenzoKeepNoteToClient` succeeds:
- Import `updateClientFieldInCache` from `@/lib/clients-supabase-cache`
- Call `updateClientFieldInCache(registeredDateTimeAD, 'benzoKeepNotes', JSON.stringify(noteData))` to sync the note to the database cache
- Wrap in try/catch so a cache failure doesn't block the success toast

### File 2: `src/components/suite/AssignNoteDialog.tsx`

In `handleTransfer` (line 78), after `transferBenzoKeepNote` succeeds:
- Import `updateClientFieldInCache` from `@/lib/clients-supabase-cache`
- The note content needs to be converted to the Benzo Keep JSON format before storing
- Call `updateClientFieldInCache(registeredDateTimeAD, 'benzoKeepNotes', noteJsonString)` to sync

### Files Modified

| File | Change |
|---|---|
| `src/components/suite/BenzoKeepNotepadDialog.tsx` | Add Supabase cache update after `assignBenzoKeepNoteToClient` |
| `src/components/suite/AssignNoteDialog.tsx` | Add Supabase cache update after `transferBenzoKeepNote` |

