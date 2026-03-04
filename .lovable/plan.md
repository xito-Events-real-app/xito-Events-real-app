

## Plan: WTN Files Full-Screen Announcement Popup

### Behavior
- Shows every time the app opens, for 48 hours from first deployment (expiry: `2026-03-06T23:59:59`)
- After dismissing, won't show again for 2 hours (store timestamp in localStorage, re-show if 2hrs elapsed)
- Plays celebration music (`/audio/meditation-music.mp3` — we'll reuse this or add a new audio file) while popup is open, stops on dismiss
- Blue theme (file management branding)
- Navigates to `/files` on CTA click

### New File: `src/components/files/WtnFilesAnnouncementDialog.tsx`

**Timing logic:**
```typescript
const ANNOUNCEMENT_KEY = "wtn-files-announcement-last-shown";
const ANNOUNCEMENT_EXPIRY = new Date("2026-03-06T23:59:59").getTime();
const SHOW_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours

useEffect(() => {
  if (Date.now() > ANNOUNCEMENT_EXPIRY) return;
  const lastShown = localStorage.getItem(ANNOUNCEMENT_KEY);
  if (lastShown && Date.now() - parseInt(lastShown) < SHOW_INTERVAL) return;
  // show popup
}, []);
```

On dismiss/navigate: `localStorage.setItem(ANNOUNCEMENT_KEY, Date.now().toString())`

**Audio:** Create an `Audio` object on open, play celebration music, pause+cleanup on dismiss.

**UI (blue theme):**
- Full-screen dark gradient: `from-slate-950 via-blue-950 to-cyan-950`
- Confetti in blue tones: `#4D96FF`, `#00D2FF`, `#60A5FA`, `#38BDF8`, etc.
- Dancing emojis: `📁`, `💾`, `🗂️`, `📂`, `🎊`, `🎉`, `🥳`, `💿`
- Main icon: blue gradient circle with `FolderOpen` icon
- Badge: `✨ NEW FEATURE ✨` in blue
- Title: `"Oh Yes!! WTN FILES is finally here!"` then `"Check it out"`
- Personal line: `"So Mr. Jeewan, Are you readdddyyyy ???"` 
- CTA at mid-bottom: `"Open WTN Files Now 🚀"` button → navigates to `/files`
- "Maybe later" ghost button

### Changes to `src/App.tsx`
- Import `WtnFilesAnnouncementDialog` 
- Render it inside `<AuthProvider>` above `<Routes>`, passing `onNavigate` that uses `useNavigate` to go to `/files`
- Since `App` doesn't have access to `useNavigate` directly (it's above `BrowserRouter`), we'll create a small wrapper component inside Routes or render the dialog inside a layout component

Actually simpler: render it inside `BrowserRouter` block, create a small wrapper:
```tsx
function WtnFilesAnnouncement() {
  const navigate = useNavigate();
  return <WtnFilesAnnouncementDialog onNavigate={() => navigate('/files')} />;
}
```

### CSS Additions to `src/index.css`
- Reuse existing announcement animation classes (confetti, float, dance, flash, icon-pulse, cta-glow) — they're already defined
- Add blue-themed glow variant if needed: `.wtn-files-cta-glow`

### Audio
- Use `/audio/meditation-music.mp3` as celebration music (already exists in public folder)

