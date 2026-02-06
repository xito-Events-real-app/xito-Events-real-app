

## WTN Daily Task -- Complete Redesign

### Overview
Redesign the WTN Daily Task module to match the Benzo Keep / Google Keep card-based style, replace the table with task cards, add a centered dialog for adding tasks, implement a scrollable 12-date Nepali date navigation bar with task count badges, fix WhatsApp by using `wa.me` URL properly, and show human-readable deadline countdowns.

---

### Changes Summary

#### 1. Redesign Task Display: Cards Instead of Table
Replace the current `<Table>` in `DesktopDailyTasks.tsx` with a responsive grid of Google Keep-style cards:
- Each task = a colored card (urgency-based background, like Benzo Keep marker colors)
- Card shows: Task Name (bold title), Description, Handler, Deadline countdown, Status badge, Urgency badge
- Overdue cards get a red border + "OVERDUE" badge
- Cards have action buttons: Status dropdown, Send to Handler
- Grid layout: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`

#### 2. Centered Dialog for Adding Tasks
Replace `AddTaskDrawer` (side Sheet) with a centered `Dialog` component (like BenzoKeepNotepadDialog):
- Use `<Dialog>` + `<DialogContent className="max-w-xl">` for centered popup
- Same form fields, just in a centered modal instead of a side drawer
- Rename component to `AddTaskDialog`

#### 3. Scrollable Nepali Date Navigation Bar (12 dates)
Replace the Yesterday/Today/Tomorrow/All buttons with a horizontal scrollable date strip:
- Show 12 dates centered on today's date (6 before, today, 5 after)
- Each date displayed in Nepali format: "Magh 20", "Magh 21", etc.
- Today's date prominently displayed at the center, highlighted with a larger/bold style
- Left/Right arrow buttons to shift the entire 12-date window backward/forward
- Each date pill shows a red notification badge with task count (e.g., "2") if tasks exist on that day
- An "All" button at the end to show all tasks
- Clicking a date filters tasks to that AD date

#### 4. Human-Readable Deadline Countdown
Instead of showing raw deadline datetime, compute and display:
- "1 day 2 hrs 35 mins remaining" (if in the future)
- "OVERDUE by 3 hrs 20 mins" (if past deadline)
- Update: use a helper function that calculates days/hours/minutes difference from `now` to the deadline

#### 5. Fix WhatsApp Integration
The current `openWhatsApp` utility already uses `wa.me` URLs (not `api.whatsapp.com`). The `ERR_BLOCKED_BY_RESPONSE` error is likely caused by the iframe preview environment. The fix:
- The `wa.me` URL approach should work in production (outside iframe)
- For the preview environment, we can add `window.open()` as a fallback after the anchor click method
- No edge function proxy is needed since we're just opening a URL, not making an API call

---

### Technical Details

**Files to modify:**

| File | Change |
|------|--------|
| `src/components/tasks/DesktopDailyTasks.tsx` | Complete rewrite: cards grid, 12-date nav bar, deadline countdown, centered dialog |
| `src/components/tasks/AddTaskDrawer.tsx` | Convert from Sheet to Dialog, rename to AddTaskDialog |
| `src/lib/whatsapp-utils.ts` | Add `window.open` fallback for iframe environments |

**Date Navigation Logic:**
- State: `centerDate` (defaults to today's AD date)
- Compute 12 dates: `centerDate - 5` to `centerDate + 6`
- Convert each AD date to BS using `nepali-date-converter` for display (e.g., "Magh 23")
- For each date, count tasks matching that `dateAD` to show badge count
- Left arrow: shift `centerDate` by -6 days; Right arrow: shift by +6 days

**Deadline Countdown Helper:**
```text
function getDeadlineText(deadline: string): { text: string, isOverdue: boolean }
- Parse deadline as Date
- Calculate diff from now in days, hours, minutes
- Return formatted string like "1d 2h 35m remaining" or "Overdue by 3h 20m"
```

**Task Card Structure:**
```text
+----------------------------------+
| [Urgency Badge]    [Status Badge]|
| Task Name (bold, full width)     |
| Description (2-3 lines)         |
|                                  |
| Handler: Benzo                   |
| Deadline: 1d 2h 35m remaining   |
| Contact: 98XXXXXXXX             |
|                                  |
| [Change Status v]  [Send WA]    |
+----------------------------------+
```
Card background color matches urgency (5=red-100, 4=orange-100, 3=yellow-50, 2=green-50, 1=gray-50), with a colored left border like Benzo Keep cards.

