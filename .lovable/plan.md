

## Fix: Schedule Dialog Hidden Behind HoverCard

### Problem
The "Send Schedule" `Dialog` renders inside `FreelancerHoverInfo`, which is inside a `HoverCardContent` with `z-[300]`. The Dialog overlay and content use `z-[200]`, so the HoverCard sits on top of the Dialog.

### Fix — `src/components/suite/AllClientsCrewTable.tsx`

**Line ~1934**: Add higher z-index classes to `DialogContent`:
```tsx
<DialogContent className="max-w-sm z-[500]">
```

This ensures the Dialog (and its overlay) renders above the HoverCard. The Dialog's portal renders at `document.body` level, so only the z-index needs bumping. The overlay from `dialog.tsx` also needs to be above `z-[300]` — it's already `z-[200]`, so we override it on this specific Dialog's content to `z-[500]`.

Additionally, we need to add a custom overlay z-index. The simplest approach: wrap the Dialog content className with `z-[500]` and also pass a custom overlay. Since the Dialog component auto-renders `DialogOverlay` inside `DialogContent`, we'll override by adding `[&~div]:z-[400]` or simply set the DialogContent's parent portal z-index.

**Simplest reliable fix**: Add `className="z-[500]"` to the `DialogContent`, which already uses `fixed` positioning. For the overlay, we'll add an explicit style override on the DialogContent wrapper.

### File changed
- `src/components/suite/AllClientsCrewTable.tsx` (~line 1934)

