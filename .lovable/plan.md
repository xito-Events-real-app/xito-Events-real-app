

## Fix: Event Details Cache Has Unsplit Multi-Event Rows

### Problem
When the 3 clients were restored, the `event_details_cache` auto-populated from `clients_cache` but stored ALL events in a single row (index 0) using `|||` separators, instead of splitting them into one row per event.

**Current bad state (Pramila Bhusal):**
- Row 0: `event_name = "BRIDE MEHNDI|||WEDDING BRIDE"`, `event_day = "10|||12"`
- Row 1: `event_name = "WEDDING BRIDE"`, `event_day = "12"` ← correct but duplicate

**Same issue for Pushpa Poudel & Siwan Kharal:**
- Row 0: `event_name = "BRIDES MEHNDI|||WEDDING(BOTH SIDES)"`, `event_day = "6|||8"`
- Row 1: `event_name = "WEDDING(BOTH SIDES)"`, `event_day = "8"` ← correct

**Geeta & William:** Fine (single event).

### Fix (Data-only, no code changes)

1. **Delete** the broken index-0 rows for Pramila and Pushpa (where values contain `|||`)
2. **Upsert** correct split rows:

**Pramila Bhusal** (`2026-01-25T13:16:03.057Z`):
- Index 0: BRIDE MEHNDI, 2082, 11, 10, 2026-02-22
- Index 1: WEDDING BRIDE, 2082, 11, 12, 2026-02-24 (already exists, keep)

**Pushpa Poudel** (`2026-01-26T08:38:58.826Z`):
- Index 0: BRIDES MEHNDI, 2082, 11, 6, 2026-02-18
- Index 1: WEDDING(BOTH SIDES), 2082, 11, 8, 2026-02-20 (already exists, keep)

3. Also fix the `clients_cache` `events` separator — currently using `|||` but the system expects `\n` (newline). Update events, event_year, event_month, event_day columns to use newline separators for all 3 restored clients.

### Root Cause Prevention
The `useEventDetails` hook's skeleton-building logic in `loadData()` already handles splitting correctly — the issue was that the restored `clients_cache` rows used `|||` instead of `\n` as the multi-value separator, so the skeleton builder treated the entire `|||`-joined string as one event name.

