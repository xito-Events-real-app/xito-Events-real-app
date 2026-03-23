

## Add Photo/Video Size Breakdown + TB Display to Dashboard Cards

### What changes

**1. `src/hooks/useFilesDashboardData.ts` — Expand `DashboardStats`**

Add photo/video size fields for each card category. Use `freelancer_type` to classify:
- PHOTO roles: `PB`, `PG`, `EP`
- VIDEO roles: `VB`, `VG`, `EV`, `DRONE`, `FPV`, `IPHONE`

New stats fields:
- `todayPhotoGB`, `todayVideoGB`
- `totalPhotoGB`, `totalVideoGB`
- `pendingPhotoCount`, `pendingVideoCount`
- `backupDonePhotoGB`, `backupDoneVideoGB`, `backupRemainingPhotoGB`, `backupRemainingVideoGB`

All existing GB fields converted to display as TB (divide by 1024).

**2. `src/components/files/FilesDashboard.tsx` — Update card display**

- `getCardDisplay()` returns additional lines for photo/video sizes in TB
- Each card shows: main count → total size in TB → photo size in TB → video size in TB
- Layout: keep primary number large, add a compact 2-line photo/video breakdown below the secondary text

Example card layout:
```text
Today's Transfers
42          1.2 TB
📷 0.5 TB  🎬 0.7 TB
```

### Files changed
1. `src/hooks/useFilesDashboardData.ts` — compute photo/video sizes per category
2. `src/components/files/FilesDashboard.tsx` — render photo/video breakdown in cards, display TB

