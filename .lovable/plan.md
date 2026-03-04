

## Root Cause: Status Log Format Mismatch

The Breaking News feed shows "18 hrs ago" instead of "4 hrs ago" for Sushant because the parser **cannot read the frontend-generated status log format**, so it falls back to the previous (older) status entry.

### The format conflict

**Frontend** (`generateStatusLogEntry` in `timestamp-utils.ts`):
```
03/04/2026, 17:45:30 - BOOKED       ← timestamp FIRST, then status
```

**Backend** (`updateClientStatus` in `google-sheets/index.ts`):
```
BOOKED - 03/04/2026, 17:45:30       ← status FIRST, then timestamp
```

**Parser** (`parseStatusTimestamp` in `client-card-utils.ts`):
- `bracketMatch`: looks for `STATUS [MM/DD/YYYY, HH:MM:SS]` -- no match for either
- `dashMatch`: looks for `- MM/DD/YYYY, HH:MM:SS` -- matches backend format only

The frontend's BOOKED entry (4 hrs ago) is invisible to the parser. So the Breaking News feed shows the last parseable entry (ADVANCE PENDING, 18 hrs ago).

### Fix

**Option A (preferred)**: Fix `generateStatusLogEntry` to use the same format as the backend -- `${newStatus} [${timestamp}]` (bracket format). This is the standard format and both parser patterns already handle it.

**File**: `src/lib/timestamp-utils.ts`, line 22
```typescript
// Before:
const newEntry = `${timestamp} - ${newStatus}`;

// After:
const newEntry = `${newStatus} [${timestamp}]`;
```

**Option B (belt-and-suspenders)**: Also update `parseStatusTimestamp` to handle the frontend's current format as a fallback, in case old cached entries exist:

**File**: `src/lib/client-card-utils.ts`, line 161-177

Add a third regex pattern:
```typescript
const reverseDashMatch = statusEntry.match(
  /(\d{1,2}\/\d{1,2}\/\d{4}),\s*(\d{1,2}:\d{2}:\d{2})\s*-/
);
const match = bracketMatch || dashMatch || reverseDashMatch;
```

### Summary

Two small changes:
1. Fix `generateStatusLogEntry` format to `${newStatus} [${timestamp}]`
2. Add fallback regex in `parseStatusTimestamp` for old cached entries

