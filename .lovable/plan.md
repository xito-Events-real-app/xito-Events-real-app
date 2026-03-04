

## Plan: Upgrade WTN Files Announcement Popup

### 3 Changes

**1. Copy uploaded audio to `public/audio/wtn-celebration.mp3`**
- Replace meditation music with the uploaded celebration sound

**2. Update `src/components/files/WtnFilesAnnouncementDialog.tsx`**
- Accept `user` prop — only show popup when user is logged in
- Use new audio file `/audio/wtn-celebration.mp3`
- Add way more celebration animations:
  - 80 confetti pieces (up from 40), with varied sizes and shapes (circles + rectangles + stars)
  - Firework burst rings that pulse outward
  - Trophy emoji (🏆) bouncing in center
  - Gold/blue/cyan sparkle particles floating up from bottom
  - Stadium wave effect with staggered emoji rows
  - "World Cup winning" style — multiple layers: confetti rain + rising sparkles + pulsing fireworks + camera flashes + trophy bounce
  - More dancing emojis: add 🏆⭐🎖️🥇 to the lineup
  - Streamer ribbons (thin colored divs rotating and falling)

**3. Update `src/App.tsx`**
- Pass `user` from `useAuth()` into `WtnFilesAnnouncementDialog` so it only triggers after login
- Move the wrapper inside `AuthProvider` and use auth context

**4. Add new CSS animations to `src/index.css`**
- `@keyframes firework-burst` — ring expanding outward and fading
- `@keyframes sparkle-rise` — particles floating upward with shimmer
- `@keyframes trophy-bounce` — heavy bounce like a trophy being raised
- `@keyframes streamer-fall` — thin ribbons falling with rotation

### Auth-gating approach
```tsx
// WtnFilesAnnouncementDialog accepts user prop
export function WtnFilesAnnouncementDialog({ onNavigate, user }: { onNavigate: () => void; user: any }) {
  // In useEffect, add: if (!user) return;
}

// In App.tsx wrapper:
function WtnFilesAnnouncement() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  return <WtnFilesAnnouncementDialog user={user} onNavigate={() => navigate('/files?section=files')} />;
}
```

