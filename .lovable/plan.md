

## Selected Photos: Photographer Sub-Switches + Notes

### What changes

**`src/components/client-detail/DeliverablesSection.tsx`**

1. **Update props** to accept `assignments` from parent:
   ```typescript
   interface DeliverablesProps {
     events: EventInfo[];
     assignments?: FreelancerAssignment[];
   }
   ```

2. **Add fields to `ItemState`**:
   ```typescript
   interface ItemState {
     enabled: boolean;
     quantity: number;
     names: string[];
     albumName?: string;
     photographerToggles?: Record<string, boolean>; // e.g. { "PB::ARJUN": true, "PG::NIKIT": false }
     notes?: string;
   }
   ```

3. **Replace the `SimpleRow` for "Selected Photos"** with a new `SelectedPhotosRow` component that:
   - Shows the main switch (same as now)
   - When ON, finds the matching assignment for that event from `assignments` prop
   - Extracts photographers: PB (`photographerBride`), PG (`photographerGroom`), EP (`extraPhotographer`) — in that order always
   - Renders each assigned photographer as a sub-row: `PB ARJUN (switch)`, `PG NIKIT (switch)` etc.
     - **Single photographer**: auto-enabled, shown as active
     - **Multiple photographers**: all shown, each with their own switch; OFF ones rendered in muted/opacity style
     - **Zero photographers**: shows "No photographers assigned" hint text
   - Below the photographer toggles, renders a **notes textarea** (always visible when Selected Photos is ON)

4. **Visual style for photographer sub-rows**:
   - Indented under Selected Photos (pl-4)
   - Each row: `PB` as a small bold badge + freelancer name + switch
   - ON state: normal text color
   - OFF state: `opacity-40` or `text-muted-foreground` — visually muted

**`src/pages/ClientDetail.tsx`**

5. **Pass `freelancerAssignments`** to `DeliverablesSection`:
   ```tsx
   <DeliverablesSection 
     events={events.map(e => ({ name: e.name, month: e.month, day: e.day }))} 
     assignments={freelancerAssignments}
   />
   ```

### Files changed
1. `src/components/client-detail/DeliverablesSection.tsx` — new `SelectedPhotosRow`, updated `ItemState`, updated props
2. `src/pages/ClientDetail.tsx` — pass `freelancerAssignments` prop (line 1732)

