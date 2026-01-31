

## Fix: Expand Master Search Container on Desktop to Show 12 Recent Searches

### Problem Identified

The Master Search component on the Desktop Suite Dashboard is placed inside a container with **`w-80`** (320px fixed width). This is why only 4 recent search chips are visible at once - the container is too narrow.

To fit 12 recent searches visible at once (without scrolling), the container needs to be much wider.

### Solution

**Expand the Master Search container width on desktop** from `w-80` (320px) to approximately `w-[750px]` (750px), which provides enough horizontal space to display 12 compact search chips side-by-side.

---

### Technical Changes

**File: `src/components/suite/SuiteDashboardContent.tsx`**

Change line 84 from:
```tsx
<div className="absolute bottom-6 left-6 w-80 z-10">
```
To:
```tsx
<div className="absolute bottom-6 left-6 w-[750px] max-w-[calc(100%-3rem)] z-10">
```

- **`w-[750px]`**: Provides enough width for ~12 compact chips
- **`max-w-[calc(100%-3rem)]`**: Prevents overflow on smaller desktop screens

---

**File: `src/components/suite/MasterSearchButton.tsx`**

Fine-tune chip styling to be more compact so 12 fit well:
- Reduce horizontal padding slightly: `px-2.5` (was `px-2`)
- Keep text size small: `text-xs`
- Keep `shrink-0` and `whitespace-nowrap` to prevent wrapping

Also update `MAX_DISPLAY_RECENT` constant from `10` to `12` so up to 12 recent searches are rendered.

---

### Visual Result

| Before | After |
|--------|-------|
| Container: 320px wide | Container: 750px wide |
| 4 chips visible | 12 chips visible |
| Scrolling needed immediately | All chips visible without scroll |

---

### Files to Modify

1. `src/components/suite/SuiteDashboardContent.tsx` - Widen the Master Search container
2. `src/components/suite/MasterSearchButton.tsx` - Increase `MAX_DISPLAY_RECENT` to 12

