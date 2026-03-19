

## Fix AllClientsCrewTable UI Issues

### Changes — `src/components/suite/AllClientsCrewTable.tsx`

**1. Fix FreelancerHoverInfo transparency/z-index issue**
- The `HoverCardContent` on CrewCell (line 1839) has `z-[200]` but appears behind/transparent because it renders inside the table which clips it. Change to `z-[300]` and add `bg-popover` explicitly to ensure solid background.
- Same fix for client hover card (line 719).

**2. Increase text sizes in table rows**
- Day column (line 703): change `text-xs` to `text-sm` and increase padding
- Client name (line 714): already `text-sm font-bold` — good
- Event name (line 726): already `text-sm` — good  
- Crew cell freelancer names (line 1830): change `text-xs` to `text-sm`
- Unassigned cells (lines 1882, 1888): change `text-xs` to `text-sm`
- Table header (lines 1120-1122): increase column header text

**3. Make dates bold and big + unassigned dates glow**
- Day column: change to `text-base font-black` for bigger, bolder dates
- For rows with unassigned required slots: add a glowing ring animation around the day number (e.g., `ring-2 ring-red-400 animate-glow-pulse rounded-full` styling)
- Need to compute `hasUnassigned` per row by checking required crew columns

**4. Replace GaneshIcon with spinning animation for lagan dates**
- Remove `<GaneshIcon>` from day cells (lines 705, 808)
- For lagan dates: wrap the day number in a container with a CSS spinning + scale-pulse animation
- Add custom keyframes: `lagan-spin` that combines `rotateY` with a scale pulse and shadow
- Apply via Tailwind arbitrary animation or add to `index.css`

**5. Add spinning lagan animation to `src/index.css`**
```css
@keyframes lagan-spin {
  0% { transform: rotateY(0deg) scale(1); box-shadow: 0 0 8px rgba(249, 115, 22, 0.4); }
  50% { transform: rotateY(180deg) scale(1.15); box-shadow: 0 0 20px rgba(249, 115, 22, 0.8); }
  100% { transform: rotateY(360deg) scale(1); box-shadow: 0 0 8px rgba(249, 115, 22, 0.4); }
}
.animate-lagan-spin {
  animation: lagan-spin 3s ease-in-out infinite;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
```

### Files to modify
1. `src/components/suite/AllClientsCrewTable.tsx` — all UI fixes
2. `src/index.css` — add lagan-spin animation

