

# Show Both Current and Old (First Cycle) Timings

## What Changes

For videos that go through re-edit cycles, each timing field will show both the **latest cycle** value and the **first cycle** value in faded text. Example: `15m (old 7m)`.

## Changes

### 1. `src/lib/video-edit-time-utils.ts`

**Update interface** to include `old` variants for each timing field:

```ts
export interface VideoEditTimings {
  editLabTime: string | null;
  editLabTimeOld: string | null;      // first cycle if different
  editTime: string | null;
  editTimeOld: string | null;
  // ... same pattern for all fields
  colorQueueTime: string | null;
  colorQueueTimeOld: string | null;
  colorTime: string | null;
  colorTimeOld: string | null;
  exportQueueTime: string | null;
  exportQueueTimeOld: string | null;
  exportedTime: string | null;
  exportedTimeOld: string | null;
  clientReviewTime: string | null;
  clientReviewTimeOld: string | null;
  reEditTime: string | null;
  // ... existing fields unchanged
}
```

**Compute both first and last cycle**: For statuses that can repeat (EXPORTED, EXPORT_QUEUE, COLOR_QUEUE, etc.), use `findFirst()` for old and `findLast()` for current. Only set the `old` value when `findFirst !== findLast` (meaning there were multiple cycles).

Logic:
- `exportedLast = findLast("EXPORTED")`, `exportedFirst = findFirst("EXPORTED")`
- If they differ → compute old timing from first occurrence, current from last
- Same pattern for all repeatable stages

### 2. `src/components/suite/YouTubeDashboard.tsx`

**Update `TimingRow` component** to accept an optional `oldValue` prop and render it faded:

```tsx
function TimingRow({ icon, iconColor, label, value, oldValue }) {
  return (
    <div className="flex items-center gap-2">
      <span className={iconColor}>{icon}</span>
      <span className="text-gray-500">{label}:</span>
      <span className="font-semibold text-gray-800">
        {value || "—"}
        {oldValue && <span className="text-gray-400 font-normal ml-1">(old {oldValue})</span>}
      </span>
    </div>
  );
}
```

Pass `oldValue` props to each `TimingRow`:
```tsx
<TimingRow ... label="Exported" value={timings.exportedTime} oldValue={timings.exportedTimeOld} />
<TimingRow ... label="Export Queue" value={timings.exportQueueTime} oldValue={timings.exportQueueTimeOld} />
// etc.
```

### Files Modified
1. `src/lib/video-edit-time-utils.ts` — compute both first-cycle and last-cycle timings
2. `src/components/suite/YouTubeDashboard.tsx` — display old values in faded text

