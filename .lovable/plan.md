

## Fix Video Edit Tracker: Rows Not Appearing

### Root Cause Analysis

Three issues found by testing the edge function directly:

1. **Append errors are silently swallowed** — The `generateVideoEditRows` function calls the Google Sheets API to append rows but never checks the response. If the sheet tab "BOOKED CLIENTS VIDEO EDIT TRACKER" doesn't exist or there's any API error, it logs "Generated 4 rows" anyway because that count is based on the array built in memory, not on successful sheet writes.

2. **`item_names` parsing is broken** — The database stores `item_names` as `|||`-separated strings (e.g., `"BRIDE HALDI MEHNDI|||GROOM HALDI"`), but the code does `JSON.parse(del.item_names)` which always fails, falling back to `[]`. This means sub-event names always use the fallback pattern instead of actual names.

3. **Dedup never works** — Since `getVideoEditRows()` always returns `[]` (no data in sheet), every call to `generateVideoEditRows` tries to insert the same 4 rows again.

### Fix Plan

**File: `supabase/functions/google-sheets/index.ts`**

1. **Add error logging to the append call** (~line 8266-8272): After the append `fetchWithRetry`, check response status and log the error body if it fails. This will reveal if the sheet tab is missing.

2. **Fix `item_names` parsing** (~line 8221): Change from `JSON.parse(del.item_names)` to split by `|||`:
   ```
   itemNames = (del.item_names || '').split('|||').map(s => s.trim()).filter(Boolean)
   ```

3. **Auto-create the sheet tab if missing**: Before the first read/append, check if the tab exists. If not, use the `batchUpdate` API to create the sheet with a header row (Columns A-R). This matches the pattern of the spreadsheet being the source of truth — the tab must exist first.

4. **Log the append response** for debugging visibility.

### Files Changed
- `supabase/functions/google-sheets/index.ts` — Fix item_names parsing, add sheet auto-creation, add error handling on append

