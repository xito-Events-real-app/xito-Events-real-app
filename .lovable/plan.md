

# Make Today's Date Stand Out with Pink/Coral Glow and On-Off Animation

## Problem
The current emerald green glow on today's date blends in with the other green calendar days. The animation is too subtle (smooth pulse) and not noticeable.

## Solution
Use a **pink/coral color** (matching the app's primary palette -- coral/orange at `hsl(15, 90%, 55%)`) and change the animation to a more dramatic **on-off blink pattern** instead of a smooth pulse.

## Changes

### 1. Replace glow-pulse keyframes in `src/index.css`

Replace the smooth glow-pulse with a sharp on-off pattern:

```css
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 6px rgba(251, 113, 133, 0.3); }
  40% { box-shadow: 0 0 18px rgba(251, 113, 133, 0.9), 0 0 30px rgba(244, 63, 94, 0.4); }
  50% { box-shadow: 0 0 18px rgba(251, 113, 133, 0.9), 0 0 30px rgba(244, 63, 94, 0.4); }
  60% { box-shadow: 0 0 6px rgba(251, 113, 133, 0.3); }
}
```

This creates a visible "flash on, hold, flash off" effect rather than a barely-perceptible smooth fade.

### 2. Update today's styling in `src/pages/CrewSchedule.tsx` (line 390)

Change from emerald to pink/rose:

```
bg-rose-500 text-white font-bold ring-2 ring-rose-300 shadow-[0_0_14px_rgba(251,113,133,0.6)] animate-[glow-pulse_1.5s_ease-in-out_infinite]
```

- **bg-rose-500**: Solid pink background -- completely different from all the green days
- **ring-2 ring-rose-300**: Pink ring border
- **shadow with rose color**: Pink glow shadow
- **1.5s duration** (faster than 2s): More noticeable pulsing
- The on-off keyframe pattern makes the glow visibly flash

