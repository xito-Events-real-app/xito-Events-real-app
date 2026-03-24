

## Potential Delete — Approval Workflow, Comments, Deletion Confirmation & Device Dedup Fix

### Database Migration

Add 4 columns to `potential_deletes`:
```sql
ALTER TABLE potential_deletes 
  ADD COLUMN delete_approval text DEFAULT '' NOT NULL,
  ADD COLUMN approved_by text DEFAULT '' NOT NULL,
  ADD COLUMN comments text DEFAULT '' NOT NULL,
  ADD COLUMN permanently_deleted_at timestamptz DEFAULT NULL;
```

### Changes

**1. `src/hooks/usePotentialDeletes.ts`**
- Add new fields to interface: `delete_approval`, `approved_by`, `comments`, `permanently_deleted_at`
- Add `updateApproval(id, approval, approverName)` — updates `delete_approval` and `approved_by`
- Add `confirmDeletion(id)` — sets `permanently_deleted_at = now()`, moves to permanently deleted state
- Add `addComment(id, text, commenterName)` — prepends timestamped comment using `|||` delimiter

**2. `src/pages/PotentialDelete.tsx` — Major overhaul**

**Fix device dropdown duplicates**: Deduplicate `filteredDevices` using a `Set` on `device_name`.

**New view tabs** (top filter bar): ALL / PENDING / READY TO DELETE (default) / DON'T DELETE / PERMANENTLY DELETED

**Card approval section** (for pending cards):
- Shows: "Can we delete it, [Responsibility]?" with 3 buttons: YES (green) / NO (red) / GIVE ME SOME TIME (yellow)
- Clicking stores `delete_approval` + `approved_by` (the person who clicks, selected via a name picker)

**Approved cards (READY TO DELETE section)** — Key change per user request:
- Card asks: **"Saugat, did you delete [Client Name] from [Device Name] after [Approver]'s approval?"**
- The name is always **Saugat** (hardcoded), not the responsibility person
- Single YES button. Clicking sets `permanently_deleted_at = now()`

**Permanently Deleted section**:
- Shows cards with "Image will be removed in X days" countdown (7 days from `permanently_deleted_at`)
- After 7 days, image placeholder shown instead

**Comment system on each card**:
- Expandable comment thread
- Author selector (Benzo/Nikit/Saugat/Barun/Arjun) + text input + send
- Comments displayed with name and timestamp

**Card styling by approval status**:
- Pending: default zinc border
- YES: green left border + glow
- NO: red left border
- GIVE ME SOME TIME: yellow/amber left border
- Permanently deleted: muted/gray

**Stats bar update**: Show counts for each approval status + permanently deleted

**3. `supabase/functions/cleanup-potential-deletes/index.ts`** — Edge function
- Finds records where `permanently_deleted_at` is older than 7 days and `image_url` is not empty
- Deletes image from `potential-deletes` storage bucket
- Sets `image_url` to empty string (data row preserved)

### Files changed
1. DB migration — add 4 columns
2. `src/hooks/usePotentialDeletes.ts` — new fields + methods
3. `src/pages/PotentialDelete.tsx` — approval workflow, comments, dedup fix, view tabs
4. `supabase/functions/cleanup-potential-deletes/index.ts` — auto-cleanup after 7 days

