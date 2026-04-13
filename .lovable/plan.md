

# Album Copy: Persist History, Enhanced Copy Info, Better Colors

## What changes

### 1. Store existing copy result for KARISHMA SHRESTHA in DB
Since the copy was already done but not saved to DB, we need to check the pCloud destination folder to verify files exist, then store the result in `album_copy_history`.

**Approach**: After the gear loads with no DB history, add logic to check if the destination folders already exist in pCloud. If files are found, auto-populate the copy history in the DB and show "done" status. This is a one-time reconciliation.

### 2. Add bride/groom names to "Copy Information" text
- Fetch `bride_name` and `groom_name` from `album_selection_submissions` for the client
- Include in the copy text output
- Add `https://my.pcloud.com/` link alongside the `pcloud://` deep link

**Updated copy text format:**
```
Client: KARISHMA SHRESTHA
Bride: Krishma
Groom: Sanish
Month: FALGUN EVENTS 2082
Albums: BRIDE ALBUM (140), GROOM ALBUM (140)
Total: 280 photos
pCloud: https://my.pcloud.com/
Path: ALBUM AND FRAME - WEDDING TALES NEPAL/FALGUN EVENTS 2082/KARISHMA SHRESTHA
```

### 3. Fix left/right info text colors
Current colors (`text-white/50`, `text-white/30`, `text-white/20`) are too dim. Change to:
- Album names: `text-white/80` 
- Counts: `text-emerald-400 font-bold` (keep)
- Status text: `text-emerald-300` / `text-amber-300`
- Month folder: `text-white/60`
- Date: `text-white/50`
- "In pCloud": `text-sky-400/80`

### 4. Auto-detect already-copied albums from pCloud
On mount, if no `album_copy_history` exists but `isCopyEnabled` is true, check the pCloud destination folder. If files exist there, save to DB and show done state. This prevents re-copying.

## Files changed
- **`src/components/client-detail/AlbumSection.tsx`**: All UI and logic changes (fetch bride/groom from submissions, reconciliation check, updated copy text, better colors)

