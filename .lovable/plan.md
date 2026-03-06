

## Fix: Deliverables Section - Pure UI Only (No Database)

### Problem
The current `DeliverablesSection` tries to bootstrap rows into `client_deliverables` table on load, which fails silently, resulting in zero switches rendered.

### Solution
Rewrite `DeliverablesSection` as a **pure UI component** with no Supabase calls. All state is local (useState). Database persistence will be added later.

### Props Change
Instead of `registeredDateTimeAD`, pass the **event list** directly from the parent (`ClientDetail.tsx`), since the parent already computes it:

```typescript
interface DeliverablesProps {
  events: { name: string; month: string; day: string }[];
}
```

### What the component renders

**For each event** - a card matching Freelancer section style (white bg, slate-900 gradient header with event name stamp):
- Two-column layout: **Photos** | **Videos**
- Photos: All Photos (ON), Selected Photos (OFF), Insta Posts (OFF, with +/- qty and naming)
- Videos: Full Video (ON), Highlights (ON, qty=1, default name "[EVENT] HIGHLIGHTS", +/- and naming), Reel (OFF, +/- naming), Insta Posts (OFF, +/- naming)

**After all events:**
- **OVERALL** section: Overall Highlights (OFF, +/- naming), Overall Reel (OFF, +/- naming)
- **ALBUM** section: Bride Album (OFF, +/- naming), Groom Album (OFF, +/- naming), Other Album (OFF, asks album name first, then +/- type naming)
- **PENDRIVE & FRAME** section: Pendrive (OFF, quantity only), Frame (OFF, quantity only)

### UI Style
Match Freelancer section exactly:
- `rounded-2xl bg-white border border-gray-100 shadow-sm`
- Event header: `bg-gradient-to-r from-slate-900 to-slate-800` with emerald stamp for event name
- Switch rows: light bg, gray text, clean spacing
- Section icons: Camera for photos, Video for videos

### Files Changed

1. **`src/components/client-detail/DeliverablesSection.tsx`** - Complete rewrite as pure UI, no Supabase imports, all local state with `useState` initialized from defaults per event
2. **`src/pages/ClientDetail.tsx`** - Pass `events` array (already computed at line 939) to `DeliverablesSection` instead of `registeredDateTimeAD`

