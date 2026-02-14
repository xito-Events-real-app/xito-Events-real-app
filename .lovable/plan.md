

# Date Converter for Benzo Keep Page

## Overview
Add a compact date converter bar at the top of the Benzo Keep page, below the header. Users type a date like "Magh 25" or "Feb 24" and instantly see the converted date alongside, with the converted result shown in a faded bracket style.

## How It Works

**Input → Output:**
- "Magh 25" → **Magh 25 (Feb 7, 2026)** (faded bracket)
- "Feb 24" → **Feb 24 (Falgun 12, 2082)** (faded bracket)
- "Falgun 3" → **Falgun 3 (Feb 14, 2026)**

**Future-biased logic:**
- No year specified → use current BS year (2082) for Nepali months, current AD year (2026) for English months
- If the resulting date is in the past, bump to next year automatically
- If a year IS explicitly mentioned (e.g., "Magh 25 2081"), use that year as-is

## Technical Plan

### 1. New Component: `src/components/shared/BenzoDateConverter.tsx`

A self-contained input + result display component:
- Single text input with a calendar icon
- On each keystroke (debounced ~200ms), parse the input
- Detect if input is a Nepali month name (Magh, Falgun, Baisakh, etc.) or English month name (Jan, Feb, Mar, etc.)
- Use existing `bsToAD()` and `adToBS()` from `src/lib/nepali-date.ts` for conversion
- Display result inline: bold input date + faded bracket with converted date
- Uses `nepaliMonthsEnglish` array for matching Nepali month names

**Parsing logic:**
- Match month name (case-insensitive) against `nepaliMonthsEnglish` array and English month names
- Extract day number following the month name
- Optionally extract year (4-digit number)
- If no year: use current year, then check if date is past → if so, use next year

### 2. Integrate into `src/pages/BenzoKeepPage.tsx`

- Import and place `BenzoDateConverter` between the sticky header and the notes content area (line ~246, before the notes grid)
- Compact design: small input bar with subtle styling matching the dark theme

### Files Changed
- **New:** `src/components/shared/BenzoDateConverter.tsx`
- **Modified:** `src/pages/BenzoKeepPage.tsx` (add converter below header)

