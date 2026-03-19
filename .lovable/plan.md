

## Restore Original Crew Table Row Styling

### Problem
The recent sort feature changes shrunk text sizes and replaced the original crew icon with a Settings gear icon. The screenshot shows the original UI had:
- Larger, bolder text for client names and event names
- Event names not truncated (no `max-w-[110px]`)
- A small crew/users icon (not Settings) at the right edge of the event cell for the required crew popover

### Changes — `src/components/suite/AllClientsCrewTable.tsx`

1. **Replace `Settings` icon with `Users` icon** in the event cell popover trigger (already imported)
2. **Restore text sizes**: Change `text-xs` to `text-sm` for client name and event name, increase `font-semibold` to `font-bold` for client name
3. **Remove truncation limit** on event name: remove `max-w-[110px]` constraint, allow full event name display
4. **Keep everything else** (sort dropdown, popover behavior, filtering) exactly as-is

