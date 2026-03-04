

## Plan: Add backup-style hover details to Cloud column pill

### Problem
The Cloud column hover only shows the cloud device name and drive link. It should match the BackupPill hover format: device name, timestamp (bold English date/time), and "time ago" string.

### Changes

**`src/components/files/FullScreenFilesTable.tsx`** (lines 428-431)

Update the `HoverCardContent` for the Cloud pill to include:
- Cloud device name (bold, purple)
- Drive link (if present, as a clickable/breakable line)
- Bold formatted date/time from `file.updated_at` (same format as BackupPill: "Mar 4, 2026 2:30 PM")
- Clock icon + "time ago" string (using existing `getTimeAgo` helper)

The structure will mirror BackupPill's hover:
```tsx
<HoverCardContent className="w-80 p-3 space-y-2 text-xs z-[200]" side="top">
  <div className="font-bold text-sm text-purple-700">{file.drive_upload_path}</div>
  {file.drive_link && <div className="bg-muted/50 rounded px-2 py-1.5 font-mono text-[11px] break-all">{file.drive_link}</div>}
  {displayDate && <div className="text-[11px] font-bold">{formatted date + time}</div>}
  <div className="flex items-center gap-1.5 text-muted-foreground">
    <Clock /> <span className="font-bold">{timeAgo}</span>
  </div>
</HoverCardContent>
```

### Files affected
1. `src/components/files/FullScreenFilesTable.tsx` — update HoverCardContent at lines ~428-431

