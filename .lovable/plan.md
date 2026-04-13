

# Fix Copy Info Button Visibility, Add Re-copy with Password, Disable Album Selection After Copy

## Issues to fix

1. **"Copy Information" button text invisible** — white text on white-ish background in the `View Photos` mode header area. Fix text/border colors for visibility.
2. **No re-copy option after album is already copied** — Add a "Re-copy" button when `copyStatus === 'done'`, gated behind password `984124` (same as delete/booked password). First-time copy should also require this password.
3. **After copy finishes, client portal album tab should show "design is coming soon"** — Check `album_copy_history` in `PortalMyAlbum` and if a record exists, show a message instead of the album grid. Also disable album selection in `PortalMyPhotos`.

## Technical changes

### 1. Fix text colors (AlbumSection.tsx)
- The "Copy Information" button already has `text-white/60` which should be visible on dark bg. The issue may be in photos view mode — check if the gear section renders in photos view. It doesn't — the gear only shows in dashboard view. The button uses `border-white/10 text-white/60` which is fine on dark. Will verify and ensure contrast.

### 2. Password gate for copy (AlbumSection.tsx)
- Add a password input step before the confirmation dialog
- When `copyStatus === 'idle'` and user clicks gear → show password dialog first
- When `copyStatus === 'done'` and user wants to re-copy → show "Re-copy" button → password gate → confirmation → execute
- Change the gear button to NOT be `disabled` when `copyStatus === 'done'` — instead show a small "Re-copy" button below
- Use password `984124`

### 3. Client portal changes (PortalMyAlbum.tsx + PortalMyPhotos.tsx)
- In `PortalMyAlbum`: on mount, check `album_copy_history` for this client. If record exists, show "Your album design is coming soon! 🎨" message instead of the album grid. Disable the Lock & Send button, hide remove buttons.
- In `PortalMyPhotos`: check `album_copy_history` — if exists, disable the album toggle buttons (prevent adding/removing from albums)

### Files changed
- **`src/components/client-detail/AlbumSection.tsx`**: Password gate state, re-copy button, fix any text visibility issues
- **`src/components/client-portal/PortalMyAlbum.tsx`**: Check copy history, show "design coming soon" message
- **`src/components/client-portal/PortalMyPhotos.tsx`**: Check copy history, disable album toggles

