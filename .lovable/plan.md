

# Event Details Questions — New section inside XITO GLOBAL

A second tile inside the XITO GLOBAL module that lets you author a master list of questions to ask clients about their event details. Pure storage + spreadsheet-style management for now — no connection to the client portal or event-details forms yet.

## What the user will see

### Update to XITO GLOBAL landing (`/xito-global`)
A second card next to "All Venues":
- **Event Details Questions** — clipboard-list icon, amber/orange gradient.
- Click → `/xito-global/event-details-questions`.

### New page: Event Details Questions (`/xito-global/event-details-questions`)

**Header**
- Back button → `/xito-global`
- Title "Event Details Questions" + total count
- "Add Question" button (top-right) → opens drawer

**Spreadsheet-style table**

| # | Question | Sub Question | Dropdown Options | Text Input | Number Input | Events | Actions |
|---|----------|--------------|------------------|------------|--------------|--------|---------|
| 1 | Total Number of Guests | — | — | NO | YES | #all-events | ✏️ 🗑️ |
| 2 | Will the Groom Attend Mehndi? | — | YES / NO | NO | NO | #mehndi | ✏️ 🗑️ |
| 3 | Number of Choreographed Dance Performances | — | — | NO | YES (5–7) | #mehndi #sangeet #engagement #reception #party | ✏️ 🗑️ |

- Drag handle on the left to reorder rows (sort order persisted).
- YES/NO cells render as small green/grey pills.
- Events render as **hashtag chips** (`#mehndi`, `#sangeet`, `#all-events`).
- Click row → opens edit drawer.
- Empty state: friendly message + "Add your first question" button.

**Filters above the table**
- Search box (matches question text + sub question).
- Tag filter: a chip rail of all unique tags currently in use across questions; click any chip to filter rows that include it. `#all-events` is pinned first.

### Add / Edit Question drawer

Fields, in order:
1. **Question** (text, required).
2. **Sub Question** (text, optional).
3. **Answer Type** — three independent toggles (any combination, like your sample):
   - **Dropdown Options** — when ON, tag-style chip input lets you add option chips (e.g. `YES`, `NO`, `INDOOR`, `OUTDOOR`, `MIXED`). Comma or Enter to add; click × on a chip to remove.
   - **Text Input** — ON / OFF.
   - **Number Input** — ON / OFF, with optional placeholder hint (e.g. "Enter number, e.g., 5–7").
4. **Events (Tags)** — **free-form hashtag input**, Instagram-style:
   - Type any keyword and press Enter / comma / space → it becomes a chip rendered as `#keyword` (auto lowercased, spaces replaced with `-`, special chars stripped).
   - Suggestion dropdown shows previously-used tags from other questions while typing (so people can pick `#mehndi` instead of typing `#mehendi`), but they're free to create a new one.
   - **`#all-events` is the only fixed system tag** — always available as a one-click pill at the top of the input. Selecting it clears all other tags (and vice versa: adding any other tag auto-removes `#all-events`).
   - All other tags are user-defined, no preset list — accommodates spelling variations (`#haldi`, `#mehendi`, `#mehndi`, `#sgt`, etc.).
   - Click × on any chip to remove.
5. **Save** / **Delete** (delete with confirm dialog when editing).

## What it does NOT do (yet)
- No connection to Client Portal or Event Details form.
- No publishing/versioning — every saved row is live in the master list.
- No client-facing rendering anywhere.

This is purely the master sheet. Wiring into client flows comes later.

## How it works (technical)

### New table: `xito_global_event_details_questions`
Columns:
- `id` (uuid PK), `created_at`, `updated_at`
- `question` (text, required)
- `sub_question` (text, default `''`)
- `dropdown_enabled` (bool, default `false`)
- `dropdown_options` (jsonb array of strings, default `'[]'`)
- `text_input_enabled` (bool, default `false`)
- `number_input_enabled` (bool, default `false`)
- `number_input_hint` (text, default `''`)
- `tags` (jsonb array of strings, default `'[]'`) — free-form hashtag list, e.g. `["all-events"]` or `["mehndi","sangeet"]`. Stored without the `#` prefix; UI prepends `#` for display.
- `sort_order` (int, default `0`)
- `is_active` (bool, default `true`)
- RLS: `Authenticated access only`
- Trigger: `update_updated_at_column` on UPDATE
- Index on `sort_order`; GIN index on `tags` for fast filtering

### Tag normalization rules (UI-side)
- `lowercase`, trim, replace spaces with `-`, strip non-alphanumeric except `-`.
- Reserved system tag: `all-events` (mutually exclusive with all others).
- Suggestion source: `SELECT DISTINCT jsonb_array_elements_text(tags) FROM xito_global_event_details_questions` (cached client-side).

### New files
1. `src/lib/xito-global-questions-api.ts` — `getAllQuestions()`, `addQuestion()`, `updateQuestion()`, `deleteQuestion()`, `reorderQuestions(orderedIds)`, `getAllUsedTags()`.
2. `src/hooks/useXitoGlobalQuestions.ts` — loads + exposes filtered/searched list, optimistic updates.
3. `src/pages/XitoGlobalEventDetailsQuestions.tsx` — main page (header, search, tag-chip filter rail, table).
4. `src/components/xito-global/QuestionsTable.tsx` — drag-to-reorder spreadsheet table.
5. `src/components/xito-global/AddEditQuestionDrawer.tsx` — the add/edit form.
6. `src/components/xito-global/HashtagInput.tsx` — reusable Instagram-style hashtag chip input with suggestion popover and the pinned `#all-events` system pill.

### Modified files
- `src/pages/XitoGlobal.tsx` — add the second section card.
- `src/App.tsx` — register `/xito-global/event-details-questions` route.

## Files Changed
- 1 migration (new table + indexes + trigger)
- 6 new files
- 2 edited files (`src/pages/XitoGlobal.tsx`, `src/App.tsx`)

## Confirmations
- Stand-alone module — does not touch any existing event-details, portal, or client logic.
- Sheet-style UI mirrors your sample exactly (Question · Sub Question · Dropdown Options · Text Input · Number Input · Events).
- Tags are free-form hashtags (Instagram-style), with `#all-events` as the only fixed system tag — handles spelling variations across users.
- Suggestions are pulled from previously-used tags so the team can converge naturally without forcing a fixed list.

