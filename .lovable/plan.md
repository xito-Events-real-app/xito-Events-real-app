

# Make Today's Date Glow on Crew Schedule Calendar

## What Changes
Today's date cell will have a bright emerald glow with a subtle pulsing animation, making it instantly recognizable.

## Technical Details

### 1. Add a glow keyframe animation in `src/index.css`

```css
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 8px rgba(52, 211, 153, 0.4); }
  50% { box-shadow: 0 0 16px rgba(52, 211, 153, 0.7); }
}
```

### 2. Update today's date styling in `src/pages/CrewSchedule.tsx` (line 390)

Replace the current today style:
```
bg-emerald-500/40 text-emerald-200 ring-1 ring-emerald-400
```

With a bold, glowing style:
```
bg-emerald-500 text-white font-bold ring-2 ring-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.5)]
```
Plus the `glow-pulse` animation class applied via inline style or a utility class (`animate-[glow-pulse_2s_ease-in-out_infinite]`).

This makes today's date:
- Solid emerald green background (not transparent)
- White bold text
- A glowing ring that gently pulses in and out
- Clearly distinct from all other day types

