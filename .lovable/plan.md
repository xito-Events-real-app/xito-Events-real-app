

# Remove "What's New" + Revamp Album Submission Alert

## 1. Remove StartupAnnouncementPopup
- Remove `<StartupAnnouncementPopup />` from `AdminOnlyFeatures` in `src/App.tsx`
- Remove the import line

## 2. Database Migration
Add `popup_view_count` to track cross-device views per submission:
```sql
ALTER TABLE public.album_selection_submissions
  ADD COLUMN popup_view_count integer NOT NULL DEFAULT 0;
```

## 3. Rewrite `AlbumSubmissionAlert.tsx`

### Data fetch
- Fetch **all** unhandled submissions, ordered by `created_at ascending` (oldest first)
- On open, increment `popup_view_count` by 1 for each displayed submission

### Display — scrollable list of cards (oldest first)
Each card shows:
- Client name, bride/groom names
- Album details (counts)
- Sent to (prominent)
- **"X days ago"** — calculated from `created_at` vs now
- Per-card action buttons: "Yes, sent for design" (marks `handled: true`) and "Copy original files" (navigates to client detail)

### Emergency mode (any single submission has `popup_view_count > 35`)
- Red emergency banner at top
- 10-second forced countdown timer
- **All buttons disabled** during countdown (CSS `pointer-events-none` + `opacity-50`)
- After 10s, buttons unlock — user must act on at least the oldest one
- Dialog cannot be dismissed during countdown (`onOpenChange` blocked)

### Normal mode (all submissions have count ≤ 35)
- Standard dismissible dialog
- All buttons immediately active
- User can close without acting

### Per-submission counting rule
- Each album submission counts independently (its own `popup_view_count`)
- If one submission has count 24 and another has count 1, no emergency — emergency only triggers when **any single** submission exceeds 35

## Files Changed
1. **New migration** — `popup_view_count` column
2. `src/components/suite/AlbumSubmissionAlert.tsx` — full rewrite
3. `src/App.tsx` — remove StartupAnnouncementPopup

