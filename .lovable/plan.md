

# Fix: Status Log Parsing Reads Oldest Status Instead of Newest

## The Problem

Beyond_true's status log looks like this (newest entry first):

```text
Line 0: 02/24/2026, 00:05:34 - ADVANCE PENDING       <-- CURRENT (newest)
Line 1: CALLED : QUOTATION PENDING [2026-02-12 22:45:07]
Line 2: QUOTATION SENT : REVIEW PENDING - 02/12/2026  <-- oldest
```

The `getCurrentStatus()` function uses `lines[lines.length - 1]` which grabs the **last line** (oldest entry: "QUOTATION SENT"). It should use `lines[0]` to get the **first line** (newest entry: "ADVANCE PENDING").

This bug exists in two files and affects **every client** with multiple status changes across the entire app -- status display, filtering, categorization, and status change actions all break.

## The Fix

Two single-line changes:

### 1. `src/lib/sheets-api.ts` (line 577)

```
// FROM:
const lastLine = lines[lines.length - 1];

// TO:
const lastLine = lines[0];
```

### 2. `src/lib/client-card-utils.ts` (line 511)

```
// FROM:
const lastLine = lines[lines.length - 1];

// TO:
const lastLine = lines[0];
```

## What This Fixes

- Beyond_true will correctly show as "ADVANCE PENDING" instead of "QUOTATION SENT"
- All clients with multiple status transitions will display their current status
- Status-based filtering and page categorization (Fresh Clients, Booked, Dashboard) will work correctly
- Status change actions will work properly since the app will recognize the correct current state

Two lines changed, zero risk of side effects.

