

# Fix: Add Missing "USED" Column to Storage Device Push

## Problem
The push-to-sheets code is missing the "USED" column. Currently it goes Name -> Total -> Remaining, but the sheet expects Name -> Total -> **Used** -> Remaining. This causes all columns after Total Storage to shift left by one.

## Correct Column Layouts

**HARD DRIVE / SSD (10 columns, A-J):**

```text
A: Name | B: Total Storage | C: Used | D: Remaining | E: Health | F: Safety | G: Speed | H: Purchase Date AD | I: Price | J: Purchased From
```

**PC (11 columns, A-K):**

```text
A: PC Name | B: Drive Name | C: Total Storage | D: Used | E: Remaining | F: Health | G: Safety | H: Speed | I: Purchase Date AD | J: Price | K: Purchased From
```

## Changes

**File:** `supabase/functions/google-sheets/index.ts` (pushStorageDevicesToSheetAction function, ~lines 7731-7769)

1. **HARD DRIVE / SSD row** -- insert `d.used_storage_gb` at position C (after total, before remaining). Update clear range end column from `I` to `J`.

2. **PC row** -- insert `d.used_storage_gb` at position D (after total, before remaining). Update clear range end column from `J` to `K`.

This is a ~10-line fix in one function.

