

## WTN Daily Task Module

### Overview
Build a complete "WTN Daily Task" module inside the Xito Business Suite. This module reads/writes tasks from a dedicated Google Sheet ("WTN DAILY TASK"), displays them in a desktop table with date navigation, handler filters, urgency color coding, overdue detection, and WhatsApp integration for sending task details to handlers.

---

### Prerequisites

**New Secret Required:**
- `WTN_DAILY_TASK_SPREADSHEET_ID` -- The Google Spreadsheet ID for the "WTN DAILY TASK" workbook. The user will be prompted to provide this value before implementation proceeds.

**Google Sheet Setup (Manual by User):**
- Spreadsheet: "WTN DAILY TASK"
- Sheet 1: "WTN TASK" with columns A-K (Date AD, Date BS, Task Name, Description, Deadline, Handler, Backup Handler, Contact, WhatsApp, Urgency, Status)
- Sheet 2: "WTN DAILY TASK SETUP DATA" with Column A = Handler Names (A2+), Column B = Handler WhatsApp Numbers

---

### Implementation Plan

#### 1. Backend: Edge Function Updates (`supabase/functions/google-sheets/index.ts`)

Add 4 new actions to the existing edge function:

| Action | Purpose |
|--------|---------|
| `getDailyTasks` | Fetch all tasks from "WTN TASK" sheet |
| `addDailyTask` | Add a new task row to "WTN TASK" |
| `updateDailyTaskStatus` | Update Column K (Status) for a task |
| `getDailyTaskSetupData` | Fetch handler names + WhatsApp numbers from "WTN DAILY TASK SETUP DATA" |

Key details:
- Uses `WTN_DAILY_TASK_SPREADSHEET_ID` secret (separate spreadsheet from the main client tracker)
- `getDailyTasks` reads columns A-K, returns all rows with row numbers
- `addDailyTask` appends a new row with all 11 columns
- `updateDailyTaskStatus` finds the row by matching Column A (Date AD) + Column C (Task Name) as a composite key, updates Column K
- `getDailyTaskSetupData` reads columns A-B from "WTN DAILY TASK SETUP DATA" to get handler names and their WhatsApp numbers

#### 2. API Layer (`src/lib/daily-task-api.ts`) -- New File

```typescript
interface DailyTask {
  rowNumber: number;
  dateAD: string;       // A
  dateBS: string;       // B
  taskName: string;     // C
  description: string;  // D
  deadline: string;     // E
  handler: string;      // F
  backupHandler: string;// G
  contactNo: string;    // H
  whatsappNo: string;   // I
  urgency: number;      // J (1-5)
  status: string;       // K
}

interface DailyTaskSetupData {
  handlers: string[];
  handlerWhatsApp: Record<string, string>;
}
```

Functions: `getDailyTasks()`, `addDailyTask(task)`, `updateDailyTaskStatus(rowNumber, newStatus)`, `getDailyTaskSetupData()`

#### 3. Suite Module Registration (`src/lib/suite-modules.ts`)

Update the `daily-task-manager` entry from `coming-soon` to `active`:
- Change `status` to `'active'`
- Update `path` to `'/tasks'`
- Add `statsKey: 'tasks'` (optional, for future sidebar stats)

#### 4. Suite Left Sidebar (`src/components/suite/SuiteLeftSidebar.tsx`)

Add a "WTN Daily Task" section below "Benzo Keep" as a dedicated sidebar section (similar to how Benzo Keep is structured):
- Icon: CheckSquare with purple gradient
- Label: "WTN Daily Task"
- Subtitle: "Manage daily tasks"
- Click navigates to `/tasks`

#### 5. Main Page (`src/pages/DailyTasks.tsx`) -- New File

Replace the existing `ComingSoon` route for `/tasks` with this new page. Uses `useDesktopMode` to show desktop layout.

#### 6. Desktop Task Manager Component (`src/components/tasks/DesktopDailyTasks.tsx`) -- New File

This is the main component with the following sections:

**A. Top Bar:**
- Title: "WTN Daily Task" with CheckSquare icon
- "Add Task" button (top right) -- opens AddTaskDrawer
- Back to Suite button

**B. Date Navigation Bar:**
- 4 buttons: Yesterday, Today (default highlighted), Tomorrow, All Days
- "All Days" is the default view showing all tasks
- Selecting a date filters tasks to that AD date

**C. Handler Filter Pills:**
- Dynamic pills showing only handlers that have tasks on the selected date
- Clicking a handler filters the table further
- If no tasks exist for a handler, that pill is hidden

**D. Task Table:**
- Columns: Task Name, Description, Deadline, Handler, Backup, Contact, Urgency, Status, Actions
- Sorting: Urgency descending (5 first), then Deadline ascending
- Each row colored by urgency level:
  - 5 = Red background
  - 4 = Dark Orange background
  - 3 = Yellow background
  - 2 = Light Green background
  - 1 = Grey background
- Overdue Logic: If deadline has passed AND status is not "Completed", row gets a red highlight and "OVERDUE" badge
- Status badge is clickable (dropdown to change: Pending, In Progress, Completed, Cancelled)
- "Send to Handler" button on each row

**E. Empty State:**
- When no tasks exist for selected filters, show a friendly message

#### 7. Add Task Drawer (`src/components/tasks/AddTaskDrawer.tsx`) -- New File

A slide-up drawer/sheet with form fields:
- Date AD (auto-filled with today, editable)
- Date BS (auto-converted using nepali-date-converter)
- Task Name (text input)
- Task Description (textarea)
- Deadline (date + time picker)
- Handler (dropdown from setup data)
- Backup Handler (dropdown from setup data)
- Contact Number (text input)
- WhatsApp Number (text input)
- Urgency (1-5 slider or radio buttons)
- Status (defaults to "Pending")

#### 8. WhatsApp "Send to Handler" Feature

On clicking "Send to Handler":
1. Look up the handler's WhatsApp number from `DailyTaskSetupData.handlerWhatsApp` mapping
2. Compose a pre-filled message:
```
Hello [Handler Name],

You have been assigned the following task:

Task: [Task Name]
Description: [Task Description]
Deadline: [Deadline]
Urgency: [Urgency]

Please confirm once received.
```
3. Open WhatsApp via the existing `openWhatsApp()` utility

**Note on PDF:** WhatsApp Web links (wa.me) do not support file attachments. The formatted text message above will contain all task details cleanly. If PDF generation is needed in the future, it would require a separate download button.

#### 9. Route Update (`src/App.tsx`)

Change the `/tasks` route from `<ComingSoon moduleId="daily-task-manager" />` to the new `<DailyTasks />` page component.

---

### New Files Summary

| File | Purpose |
|------|---------|
| `src/lib/daily-task-api.ts` | API layer for task CRUD |
| `src/pages/DailyTasks.tsx` | Page component (mobile/desktop switch) |
| `src/components/tasks/DesktopDailyTasks.tsx` | Desktop task manager UI |
| `src/components/tasks/AddTaskDrawer.tsx` | Add task form drawer |

### Modified Files Summary

| File | Change |
|------|--------|
| `supabase/functions/google-sheets/index.ts` | Add 4 new actions + helper functions |
| `src/lib/suite-modules.ts` | Change daily-task-manager to active |
| `src/components/suite/SuiteLeftSidebar.tsx` | Add WTN Daily Task section below Benzo Keep |
| `src/App.tsx` | Update `/tasks` route to new DailyTasks page |

---

### Technical Notes

- The edge function will use `WTN_DAILY_TASK_SPREADSHEET_ID` env var (separate from `GOOGLE_SPREADSHEET_ID` used for client tracker)
- Row identification uses rowNumber (sheet row index) for status updates
- Handler WhatsApp mapping is fetched on page load and cached in component state
- Date filtering compares the task's Column A (Date AD) against the selected date
- Urgency colors are applied via Tailwind background classes on table rows
- Overdue detection compares Column E (Deadline) against `new Date()` on the client side

