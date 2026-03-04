

## Fix: Year Event Folder Should Use Month Name, Not Number

**Problem**: When auto-generating file rows in `autoGenerateFileRows()` (line 204-205 of `src/lib/files-api.ts`), the year event folder is built as `${eventMonth.toUpperCase()} EVENTS ${eventYear}` — which produces "11 EVENTS 2082" because `eventMonth` is the raw number string "11".

The second function `ensureFileRowsForMonth` (line 462-467) already correctly converts the month number to a name using a lookup table. The first function does not.

**Fix**: In `src/lib/files-api.ts`, update lines 204-206 to convert the month number to a Nepali month name before building the folder string, matching the pattern already used at line 462-467.

```typescript
// Before (line 204-206):
const yearEventFolder = eventMonth && eventYear
  ? `${eventMonth.toUpperCase()} EVENTS ${eventYear}`
  : "";

// After:
const yearEventFolder = eventMonth && eventYear
  ? (() => {
      const mn = parseInt(eventMonth, 10);
      const MONTHS: Record<number, string> = {1:"BAISAKH",2:"JESTHA",3:"ASHADH",4:"SHRAWAN",5:"BHADRA",6:"ASHWIN",7:"KARTIK",8:"MANGSIR",9:"POUSH",10:"MAGH",11:"FALGUN",12:"CHAITRA"};
      return `${MONTHS[mn] || eventMonth.toUpperCase()} EVENTS ${eventYear}`;
    })()
  : "";
```

Single file change, one location.

