

# Fix: Intermittent Freelancer Assignment Updates on All Clients Page

## Root Cause

The `updateFreelancerAssignmentAction` in the backend uses **plain `fetch`** for both reading and writing to Google Sheets. When the Google Sheets API hits rate limits (HTTP 429) or returns transient errors, the request fails silently. Meanwhile, all other heavy operations (restore, sync, etc.) already use `fetchWithRetry` with exponential backoff.

This is why it works "sometimes" -- it depends on whether you hit the API quota at that moment. Multiple rapid assignments (clicking through several crew cells) will exhaust the quota quickly, causing intermittent failures.

## Solution

Replace both `fetch` calls in `updateFreelancerAssignmentAction` with `fetchWithRetry` to automatically retry on 429 errors with exponential backoff (up to 3 retries). This is the same pattern already proven across all other API calls in the edge function.

## File to Change

### `supabase/functions/google-sheets/index.ts` -- `updateFreelancerAssignmentAction`

Two changes inside this function (lines ~6309 and ~6354):

**Change 1: Reading the sheet**
```
// Before (line ~6309):
const flResp = await fetch(flUrl, { headers: { Authorization: `Bearer ${accessToken}` } });

// After:
const flResp = await fetchWithRetry(flUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
```

**Change 2: Writing the update**
```
// Before (line ~6354):
const resp = await fetch(updateUrl, {
  method: 'PUT',
  headers: { ... },
  body: JSON.stringify({ values: [[newCellValue]] }),
});

// After:
const resp = await fetchWithRetry(updateUrl, {
  method: 'PUT',
  headers: { ... },
  body: JSON.stringify({ values: [[newCellValue]] }),
});
```

That is the entire fix. No UI changes needed. The `fetchWithRetry` utility already exists and handles 429 errors with exponential backoff (2^attempt seconds, up to 3 retries).

