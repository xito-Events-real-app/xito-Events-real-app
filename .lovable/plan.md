
# Fix: Global Client Navigation Inconsistency

## Problem Identified

The client navigation utility was updated, but **6 files still use hardcoded navigation logic** that doesn't use the centralized `getClientDetailPath` function. This causes the off-by-one navigation bug to persist on the published site.

### Files with Incorrect Navigation

| File | Current Pattern (Broken) |
|------|-------------------------|
| `src/pages/Dashboard.tsx` | Uses `client.registeredDateTimeAD` directly (line 802) and `client.id` (line 929) |
| `src/pages/Search.tsx` | Uses `clientId` without consistent resolution |
| `src/components/booked/DesktopBookedDashboard.tsx` | Uses `originalRowNumber` or encoded `registeredDateTimeAD` (lines 409, 752, 843) |
| `src/components/desktop/DesktopClientRow.tsx` | Uses `rowNumber` first, then fallback (line 731) |
| `src/components/dashboard/FreshClientCard.tsx` | Uses `rowNumber` first, then fallback (line 1586) |

### Files Already Fixed (Using `getClientDetailPath`)
- `src/components/booked/EventClientCard.tsx`
- `src/components/booked/BookedClientCard.tsx`
- `src/components/booked/DesktopBookedClients.tsx`

## Solution

Refactor all 5 remaining files to use the centralized `getClientDetailPath()` utility, ensuring:
1. `registeredDateTimeAD` is always prioritized (true unique ID)
2. Consistent URL encoding across all navigation points
3. No more row-based navigation that can become stale

## Implementation Plan

### 1. Update `src/pages/Dashboard.tsx`
- Import `getClientDetailPath` from `@/lib/client-navigation`
- Replace line 802: `navigate(\`/client-tracker/client/${client.registeredDateTimeAD}\`)` with `navigate(getClientDetailPath(client))`
- Replace line 929: `navigate(\`/client-tracker/client/${client.id}\`)` with `navigate(getClientDetailPath(client))`

### 2. Update `src/pages/Search.tsx`
- Import `getClientDetailPath` from `@/lib/client-navigation`
- Replace line 88-92: Use `getClientDetailPath(client)` for navigation with proper state passing

### 3. Update `src/components/booked/DesktopBookedDashboard.tsx`
- Import `getClientDetailPath` from `@/lib/client-navigation`
- Replace lines 409-410, 752, and 843 with `navigate(getClientDetailPath(client))`

### 4. Update `src/components/desktop/DesktopClientRow.tsx`
- Import `getClientDetailPath` from `@/lib/client-navigation`
- Replace lines 731-733 with `navigate(getClientDetailPath(client), { state: ... })`

### 5. Update `src/components/dashboard/FreshClientCard.tsx`
- Import `getClientDetailPath` from `@/lib/client-navigation`
- Replace lines 1586-1587 with `navigate(getClientDetailPath(client))`

## Why This Fixes the Issue on Other Devices

The published site was still using old code that prioritized `rowNumber`. Once we:
1. Update all files to use the centralized utility
2. Publish the changes

All devices will use `registeredDateTimeAD` as the primary navigation ID, which is immutable and never changes regardless of row shifts.

## Technical Notes

- The `registeredDateTimeAD` format (e.g., `2026-01-18T19:25:45.624Z`) is URL-encoded via `encodeURIComponent()`
- The `ClientDetail.tsx` page already handles decoding and matching by `registeredDateTimeAD` (lines 277-280)
- This is a code-level fix that will work globally once published
