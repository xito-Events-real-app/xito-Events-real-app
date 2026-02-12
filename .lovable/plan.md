

# Full-Screen ALL CLIENTS Celebration Announcement

## Two Fixes

### 1. Navigation Fix
The "Yes, show me!" button currently navigates to `/booked-clients` which is wrong. The ALL CLIENTS view is not a separate route -- it's a **state toggle** within the Suite Landing page itself:
- **Desktop**: Sets `showAllClients` state to `true` in `DesktopSuiteLanding`
- **Mobile**: Switches to the `crew` tab in `MobileSuiteLanding`

The fix requires moving the announcement dialog **inside** both `DesktopSuiteLanding` and `MobileSuiteLanding` so it can directly trigger the correct internal state, rather than navigating to a different page.

### 2. Full-Screen Celebration Redesign
Replace the small card dialog with an immersive full-screen celebration overlay featuring:
- Full viewport coverage with dark gradient background
- Wedding-style celebration with animated silhouettes of photographers and dancing people using CSS/emoji art
- Confetti particles raining down with staggered animations
- Camera flash effects pulsing in the background
- Extra-large text (4xl/5xl headings)
- Glowing gradient CTA button
- Custom CSS keyframes for dancing, confetti rain, and camera flash animations

## Technical Changes

### File 1: `src/components/suite/AllClientsAnnouncementDialog.tsx`
- Replace the small Radix Dialog with a **full-screen fixed overlay** (`fixed inset-0 z-[100]`)
- Add animated wedding celebration background: dancing people silhouettes using emoji characters with CSS bounce/sway animations, confetti particles with staggered fall animations, camera flash pulse effects
- Scale up all text: title to `text-4xl`/`text-5xl`, description to `text-lg`
- Change `onNavigate` callback to just trigger the action (no route navigation)
- Add new CSS keyframes: `dance-sway`, `confetti-fall`, `camera-flash`, `float-up`
- The component will accept the same `onNavigate` prop but the parent will now pass the correct handler

### File 2: `src/pages/SuiteLanding.tsx`
- Remove the `AllClientsAnnouncementDialog` from this file (it will move into the child components)
- Remove the `handleGoToAllClients` function and `useNavigate` import

### File 3: `src/components/suite/DesktopSuiteLanding.tsx`
- Import and render `AllClientsAnnouncementDialog`
- Pass `onNavigate` that calls `setShowAllClients(true)` directly

### File 4: `src/components/suite/MobileSuiteLanding.tsx`
- Import and render `AllClientsAnnouncementDialog`
- Pass `onNavigate` that sets the active tab to `'crew'` directly

### File 5: `src/index.css`
- Add new keyframe animations for the celebration effects (dancing silhouettes, confetti rain, camera flash pulses)

