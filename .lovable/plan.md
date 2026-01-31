

# Plan: Fix Activity Log Timestamp Parsing for Breaking News

## Problem

The client "SEEMRON" was added with activity log timestamp `2026/01/31 21:46:00` (YYYY/MM/DD format), but the frontend parser at line 128 of `activity-utils.ts` only matches `MM/DD/YYYY` format:

```javascript
// Current regex - only matches MM/DD/YYYY
const match = timestampStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
```

This causes the activity to be silently skipped, so NIKIT's new client doesn't appear in Breaking News or Handler Activity.

---

## Solution

### 1. Update Frontend Parser with Dual-Format Support

Modify `parseActivityLogColumn()` in `src/lib/activity-utils.ts` to handle BOTH timestamp formats:
- `MM/DD/YYYY HH:MM:SS` (new correct format)
- `YYYY/MM/DD HH:MM:SS` (legacy/old format)

**Implementation:**

```typescript
// Try MM/DD/YYYY format first (correct format)
let match = timestampStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
let year: number, month: number, day: number;

if (match) {
  // MM/DD/YYYY format
  month = parseInt(match[1], 10);
  day = parseInt(match[2], 10);
  year = parseInt(match[3], 10);
} else {
  // Try YYYY/MM/DD format (legacy fallback)
  match = timestampStr.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
  if (!match) return; // Skip if neither format matches
  
  year = parseInt(match[1], 10);
  month = parseInt(match[2], 10);
  day = parseInt(match[3], 10);
}

const hours = parseInt(match[4], 10);
const mins = parseInt(match[5], 10);
const secs = parseInt(match[6], 10);
```

### 2. Redeploy Edge Function

Ensure the edge function with the correct timestamp format is deployed so new clients use `MM/DD/YYYY` going forward.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/activity-utils.ts` | Add dual-format parsing in `parseActivityLogColumn()` |

---

## Expected Result

After this fix:
1. SEEMRON (and other clients with YYYY/MM/DD timestamps) will immediately appear in Breaking News and Handler Activity for NIKIT
2. New clients will continue to work correctly with MM/DD/YYYY format
3. Both old and new timestamp formats are supported for backwards compatibility

