

# Multi-Month Folder Creation for Clients

## Problem
Currently, `buildMonthYearGroups()` assigns each client to a SINGLE month folder using a "majority month" rule. A client like KARISHMA SHRESTHA with events in FALGUN (month 11) and CHAITRA (month 12) only gets folders in one of them. This breaks file organization.

## Solution
Change `buildMonthYearGroups()` so a client appears in EVERY month where they have events, with only the relevant events listed under each month group. This single change fixes folder creation for all three modules (XITO DRIVE, pCloud, Research) since they all call `buildMonthYearGroups`.

## Example
KARISHMA SHRESTHA — events: "Reception" (FALGUN 2082), "Wedding" (CHAITRA 2082)

**Before:** Only appears under `FALGUN EVENTS 2082/KARISHMA SHRESTHA/` with both events

**After:**
- `FALGUN EVENTS 2082/KARISHMA SHRESTHA/` → only Reception event folders
- `CHAITRA EVENTS 2082/KARISHMA SHRESTHA/` → only Wedding event folders

## Technical Change

### File: `src/lib/xito-drive-utils.ts`

**Modify `buildMonthYearGroups()`** (lines 107–143):
- Instead of computing one majority key per client, iterate over each event's year+month
- Group events by their individual year-month combination
- Place the client into each relevant month group with only the events belonging to that month
- The `ClientFolder.events` array will contain only the events for that specific month

```text
Before (simplified):
  client → getMajorityYearMonth → single group → all events

After (simplified):
  client → for each event[i]:
    key = year[i] + month[i]
    add client to group[key] with event[i]
```

No other files need changes — all three tree builders (`buildXitoFolderTree`, `buildPCloudFolderTree`, `buildResearchFolderTree`) and both sync systems (`pcloud-sync.ts`, `e2-sync.ts`) consume `buildMonthYearGroups` output, so they'll automatically create folders in all relevant months.

