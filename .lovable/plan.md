

## WhatsApp Send to Both Handlers + Filter by Both Handlers

### Overview
Two enhancements to the WTN Daily Task module:
1. **WhatsApp button sends to both Main and Backup handlers** -- a dropdown replaces the single "WA" button, offering "Send to Main", "Send to Backup", and "Send to Both".
2. **Handler filter includes backup handlers** -- when filtering by a handler name, tasks where that person is the backup handler also appear.

---

### Changes

**File: `src/hooks/useDailyTasks.ts`**

1. **Handler filter logic (line 101):** Change the `filteredTasks` filter from:
   - `t.handler === handlerFilter`
   - to: `t.handler === handlerFilter || t.backupHandler === handlerFilter`

2. **Active handlers list (lines 109-112):** Include backup handlers in the set:
   - Collect both `t.handler` and `t.backupHandler` into the unique set.

3. **New `handleSendToBackupHandler` function:** Duplicate of `handleSendToHandler` but uses `task.backupHandler` and `setupData.handlerWhatsApp[task.backupHandler]`.

4. **New `handleSendToBothHandlers` function:** Calls `handleSendToHandler` then `handleSendToBackupHandler` with a small delay so both WhatsApp windows open.

5. **Export** the two new functions from the hook return.

---

**File: `src/components/tasks/DesktopDailyTasks.tsx`**

Replace the single "WA" button (line 180-182) with a `DropdownMenu` containing three options:
- "Send to [Main Handler]" -- calls `handleSendToHandler`
- "Send to [Backup Handler]" -- calls `handleSendToBackupHandler` (shown only if backup exists)
- "Send to Both" -- calls `handleSendToBothHandlers` (shown only if backup exists)

Import `DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger` from radix.

---

**File: `src/components/tasks/MobileDailyTasks.tsx`**

Same dropdown replacement for the Send button (line 171-173):
- Replace the single `<Send>` button with a `DropdownMenu` offering the same three options.
- Also update the handler display (line 145-147) to show backup handler name if present, e.g., "Handler / Backup".

---

### Technical Details

| Area | Detail |
|------|--------|
| Filter logic | `t.handler === handlerFilter \|\| t.backupHandler === handlerFilter` |
| Active handlers | `[...new Set(relevant.flatMap(t => [t.handler, t.backupHandler].filter(Boolean)))]` |
| Send to both | Opens main handler WhatsApp first, then backup after 500ms delay via `setTimeout` |
| Dropdown | Uses existing `@radix-ui/react-dropdown-menu` already installed |
| Backup guard | "Send to Backup" and "Send to Both" options only render when `task.backupHandler` exists |

