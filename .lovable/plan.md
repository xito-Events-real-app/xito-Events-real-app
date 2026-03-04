

## Fix File Path Format

**Problem**: Two issues with `buildFilePath` in `src/lib/files-api.ts`:
1. HARD_DRIVE and SSD paths include an unnecessary `\MAIN\` segment
2. All paths use double-escaped backslashes (`\\\\`) instead of single Windows-style backslashes (`\`)

**Current output**: `W-T-N- 17\\MAIN\\FALGUN EVENTS 2082\\PHOTOS\\...`
**Expected output**: `W-T-N- 17\FALGUN EVENTS 2082\PHOTOS\...`

### Fix in `src/lib/files-api.ts` (lines 260-280)

Replace the path building logic:

```typescript
// Use single backslash (Windows-style paths)
const segments = [...].filter(Boolean);

if (params.storageType === "PC") {
  const drive = params.pcDriveLetter ? `${params.pcDriveLetter}:` : "";
  return `\\\\${params.deviceName}\\${drive}\\${segments.join("\\")}`;
} else if (params.storageType === "HARD_DRIVE" || params.storageType === "SSD") {
  return `${params.deviceName}\\${segments.join("\\")}`;  // No MAIN
} else {
  return `${params.deviceName}\\${segments.join("\\")}`;
}
```

Result: `W-T-N- 17\FALGUN EVENTS 2082\PHOTOS\ABHINASH & SUBEKSHYA\GROOM RECEPTION\BHAGWAN DANGAL\Card 1`

Single file, one location change.

