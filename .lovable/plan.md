

## Replace Action Button with Stage Dropdown in Video Edit Tracker

### Changes

**1. `src/components/video-edit/DesktopVideoEditTracker.tsx`** — Replace the single "push to next" button with a `DropdownMenu` that lists all pipeline stages (excluding the current one). Selecting any stage calls `onPushToStatus(row.id, selectedStage)`.

Replace lines 158-169 (the action button cell) with:
```tsx
<TableCell className="text-center">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
        Move to <ChevronDown className="w-3 h-3" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      {STAGES.filter(s => s.key !== currentStageKey).map(s => (
        <DropdownMenuItem key={s.key} onClick={() => onPushToStatus?.(row.id, s.key)}>
          {s.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
</TableCell>
```

The `VideoEditTable` props will add `currentStageKey: string` so it knows which stage to exclude. The action column now always renders (for all stages including Finalized — useful to move items back).

**2. `src/components/video-edit/MobileVideoEditTracker.tsx`** — Same change for `VideoCard`: replace the single push button with a `Select` dropdown listing all stages except current.

**3. Remove `actionLabel`/`nextStatus` props** — Replace with `currentStageKey` prop since the dropdown handles all destinations.

### Files changed
1. `src/components/video-edit/DesktopVideoEditTracker.tsx` — dropdown menu replacing button
2. `src/components/video-edit/MobileVideoEditTracker.tsx` — select dropdown replacing button

