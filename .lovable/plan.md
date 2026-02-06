

## WhatsApp Message Enhancement

### Overview
Update the WhatsApp message sent to handlers to include a human-readable deadline countdown (e.g., "2 days 3 hrs 24 mins remaining") instead of a raw date, and replace the static "Please confirm once received." with a dynamic, context-aware closing line based on the task title and description.

---

### Changes

**File: `src/hooks/useDailyTasks.ts`**

Update the `handleSendToHandler` callback:

1. **Deadline**: Use the existing `getDeadlineText()` helper to convert the raw deadline into a human-readable string like "2d 3h 24m remaining" or "OVERDUE by 1h 15m".

2. **Dynamic closing line**: Replace the static "Please confirm once received." with a contextual action prompt derived from the task name and description. For example:
   - Task: "Call Ramesh about venue" -> "Please call Ramesh about venue and confirm once done."
   - Task: "Send invoice to client" -> "Please send invoice to client and confirm once done."
   - Logic: `"Please ${taskName.toLowerCase()} and confirm once done."` -- if the task name already starts with a verb-like word, use it directly; otherwise prefix with "complete the task: ".

**Updated message format:**
```
Hello [Handler],

You have been assigned the following task:

Task: [Task Name]
Description: [Description]
Deadline: 2d 3h 24m remaining

Please [task action derived from title/description] and confirm once done.
```

### Technical Details

- Reuse `getDeadlineText(task.deadline)` already exported from the hook
- For the dynamic closing: check if task name starts with a common verb (call, send, check, follow, prepare, visit, collect, deliver, update, review, book, arrange, confirm, contact, meet, email, message, create, write, submit, complete, finish, schedule, organize, coordinate, handle, manage, set up, pick up, drop off). If yes, use `"Please ${taskName.toLowerCase()} and confirm once done."`. Otherwise, use `"Please complete: ${taskName} and confirm once done."`
- Only one file modified: `src/hooks/useDailyTasks.ts`

