

## Plan: Fix Files Section Visibility in Client Detail Page

### Problems
1. **Graphics blend with background** — The component uses `bg-white/5`, `text-white/80`, `border-white/10` (transparent white on dark) which becomes invisible on light/mixed backgrounds
2. **SET PATH button invisible** — Uses `border-white/20 text-white/80` which doesn't show on light mode
3. **No file details visible before expanding** — Currently the collapsed event header only shows event name, date, count, and remaining status — no per-file info

### Changes to `src/components/client-detail/ClientFilesSection.tsx`

**1. Fix contrast — replace transparent white colors with theme-aware tokens**
- Stats cards: `bg-white/5 border-white/10` → `bg-muted/60 border-border`
- Text colors: `text-white/40` → `text-muted-foreground`, `text-white` → `text-foreground`
- Event group borders: `border-white/10` → `border-border`
- Event header: `bg-white/5` → `bg-muted/50`
- Table header text: `text-white/50` → `text-muted-foreground`
- Table row text: `text-white/80` → `text-foreground`
- Badges: `border-white/20 text-white/60` → use default badge styling
- SET PATH button: `border-white/20 text-white/80` → remove those overrides, use default outline button
- Section headers (PHOTOS/VIDEOS): keep the colored backgrounds but fix text contrast

**2. Show file summary before expanding**
- In the collapsed event header, add a compact summary row below the event name showing freelancer names grouped by role (e.g., "📷 Ram, Shyam · 🎥 Arjun · ☁ 2/5")
- This gives a quick glance at who's assigned and backup progress without expanding

### Scope
- Only `src/components/client-detail/ClientFilesSection.tsx` is modified
- No database or API changes needed

