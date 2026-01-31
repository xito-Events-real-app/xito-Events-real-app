
# Plan: Fix Breaking News Not Showing New Clients + Enquiry Time + Add Sync Button

## Problem Summary

1. **New clients not appearing in Breaking News / Handler Activity**: The backend generates activity log timestamps in `YYYY/MM/DD HH:MM:SS` format, but the frontend parser expects `MM/DD/YYYY HH:MM:SS` format.

2. **Enquiry time shown wrong**: The `inquiryDateAD` is stored in ISO format (YYYY-MM-DD) but the date parsing is working correctly. The issue is the time zone handling is not accounting for Nepal time zone offset.

3. **No Sync button in Handler Activity**: Users cannot manually refresh the activity data within the handler sections.

4. **Activity log timestamp format mismatch**: The `getNepalTimestamp()` helper function uses correct format, but `addClient` uses a different inline format.

---

## Root Cause Analysis

### Issue 1: Activity Log Timestamp Format Mismatch

**Backend `addClient` (line 1765):**
```javascript
nepalTimeStr.replace('T', ' ').substring(0, 19).replace(/-/g, '/')
// Input: "2025-01-31T12:30:45" 
// Output: "2025/01/31 12:30:45"  ← WRONG FORMAT (Year first)
```

**Backend `getNepalTimestamp()` (line 1122-1129):**
```javascript
return `${month}/${day}/${year} ${hours}:${mins}:${secs}`;
// Output: "01/31/2025 12:30:45"  ← CORRECT FORMAT
```

**Frontend Parser (activity-utils.ts line 128):**
```javascript
const match = timestampStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
// Expects: "MM/DD/YYYY HH:MM:SS"
```

**Result:** New client registrations have improperly formatted timestamps, so the frontend parser skips them entirely.

---

## Solution

### Fix 1: Update Backend `addClient` to Use Correct Timestamp Format

Update the edge function to use the same `getNepalTimestamp()` helper function (or inline the correct format) when generating the initial activity log entry.

**File:** `supabase/functions/google-sheets/index.ts`

**Current Code (line 1765):**
```typescript
`${nepalTimeStr.replace('T', ' ').substring(0, 19).replace(/-/g, '/')} | CLIENT_ADDED | New registration from ${clientData.source || 'Unknown'}`
```

**Fixed Code:**
```typescript
// Generate Nepal timezone timestamp in correct format (MM/DD/YYYY HH:MM:SS)
const nepalNow = new Date(now.getTime() + nepalOffset);
const initialActivityTimestamp = `${String(nepalNow.getMonth() + 1).padStart(2, '0')}/${String(nepalNow.getDate()).padStart(2, '0')}/${nepalNow.getFullYear()} ${String(nepalNow.getHours()).padStart(2, '0')}:${String(nepalNow.getMinutes()).padStart(2, '0')}:${String(nepalNow.getSeconds()).padStart(2, '0')}`;
// Use in activity log:
`${initialActivityTimestamp} | CLIENT_ADDED | New registration from ${clientData.source || 'Unknown'}`
```

---

### Fix 2: Add "Sync Recent Activities" Button to Handler Activity Section

Add a refresh button inside each handler activity section header that triggers a cache invalidation and forces fresh data fetch.

**File:** `src/components/suite/HandlerActivitySection.tsx`

**Changes:**
1. Import `RefreshCw` icon and `notifyCacheUpdate` from cache-manager
2. Add `isRefreshing` state
3. Add sync button next to the handler name
4. On click: dispatch `clients-invalidate` and `booked-clients-invalidate` events

```tsx
// Add in header, next to handler name
<button
  onClick={(e) => {
    e.stopPropagation(); // Don't toggle expand
    setIsRefreshing(true);
    notifyCacheUpdate('clients-invalidate');
    notifyCacheUpdate('booked-clients-invalidate');
    setTimeout(() => setIsRefreshing(false), 2000);
  }}
  className="p-1.5 rounded-full hover:bg-white/50 transition-colors"
>
  <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
</button>
```

---

### Fix 3: Fix Enquiry Time Display

The `getEnquiryTimeInfo` function in `client-card-utils.ts` needs to handle the case where inquiryTime might not be provided or might be in 24-hour format.

**File:** `src/lib/client-card-utils.ts`

**Current Issue:** The parsing assumes AM/PM format but the time might be stored in 24-hour format or missing entirely.

**Enhancement:** Make the time parsing more robust to handle both 12-hour and 24-hour formats, and default to start of day if no time is provided.

---

## Summary of Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/google-sheets/index.ts` | UPDATE | Fix activity log timestamp format in `addClient` (line ~1765) |
| `src/components/suite/HandlerActivitySection.tsx` | UPDATE | Add "Sync Recent Activities" button with refresh animation |
| `src/lib/client-card-utils.ts` | UPDATE | Improve `getEnquiryTimeInfo` to handle edge cases |

---

## Data Flow After Fix

```text
1. User adds new client via QuickAdd
   |
   v
2. Backend receives request, generates timestamp:
   - OLD: "2025/01/31 12:30:45"  ← Wrong
   - NEW: "01/31/2025 12:30:45"  ← Correct MM/DD/YYYY format
   |
   v
3. Writes to Column AJ: "01/31/2025 12:30:45 | CLIENT_ADDED | New registration from Facebook"
   |
   v
4. User clicks "Sync Recent Activities" OR waits for auto-refresh
   |
   v
5. Frontend fetches fresh data from sheets
   |
   v
6. parseActivityLogColumn() correctly parses timestamp
   |
   v
7. New client appears in Breaking News AND Handler Activity for NIKIT ✓
```

---

## Expected Result After Implementation

1. Newly added clients will immediately appear in Breaking News and Handler Activity sections after syncing
2. Each handler activity section will have a "Sync" button for manual refresh
3. Enquiry times will display correctly with proper time zone handling
4. Activity timestamps will use consistent `MM/DD/YYYY HH:MM:SS` format across all operations
