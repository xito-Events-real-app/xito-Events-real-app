

## Plan: Rewrite Files Sheet Sync → "BOOKED CLIENTS WTN FILES" (22 columns, A:V)

### Final Column Layout (A:V — 22 columns)

```text
Col  Header                      DB Field
───  ──────────────────────────  ──────────────────────
A    REGISTERED DATE & TIME (AD) registered_date_time_ad
B    REGISTERED DATE BS          registered_date_bs
C    CLIENT NAME                 client_name
D    EVENT                       event_name
E    EVENT YEAR                  event_year
F    EVENT MONTH                 event_month
G    EVENT DAY                   event_day
H    EVENT DATE IN AD            event_date_ad
I    FREELANCER TYPE             freelancer_type
J    FREELANCER NAME             freelancer_name
K    CARDS                       card_label
L    FILE PATH                   final_generated_path
M    SIZE IN GB                  size_gb
N    NO OF ITEMS                 number_of_items
O    FORMAT                      format_type
P    WHO COPIED                  who_copied
Q    RE-CONFIRMATION             reconfirmation
R    DOUBLE BACKUP               double_backup
S    TRIPLE BACKUP               triple_backup
T    DRIVE UPLOAD                drive_upload
U    DRIVE LINK                  drive_link
V    DELETED OR NOT              deleted_or_not
```

### Changes

**File: `supabase/functions/google-sheets/index.ts`** — Rewrite `pushFilesToSheetAction` (lines 7636-7739):

1. Change tab name from `FILES MANAGEMENT` → `BOOKED CLIENTS WTN FILES`
2. Change column range from `A:Q` (17 cols) → `A:V` (22 cols)
3. Map all 22 columns per layout above
4. Remove `deleted_or_not = false` filter so soft-deleted rows also sync
5. Add **dedup logic** using composite key (`registered_date_time_ad` + `event_name` + `freelancer_name` + `card_label`):
   - Read existing sheet rows, build key→row_number lookup
   - Rows with matching keys → batch UPDATE in-place
   - New rows → APPEND
6. Auto-create "BOOKED CLIENTS WTN FILES" tab with 22-column header if missing
7. Mark all pushed rows as `synced_to_sheet = true`

No other files need changes — `src/lib/files-api.ts` already calls `pushFilesToSheets()` which invokes action `pushFilesToSheet`, and that stays the same.

