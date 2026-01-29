

## Fix Event Details Readability Issues

The current Event Details section has severe readability problems due to low-contrast colors, small fonts, and excessive transparency. This plan redesigns it with proper visual hierarchy and readable text.

---

### Current Problems

| Issue | Example Classes | Problem |
|-------|-----------------|---------|
| Low opacity text | `text-white/40`, `text-white/60`, `text-white/70` | Very poor contrast ratio, hard to read |
| Tiny fonts | `text-xs` everywhere (12px) | Too small, especially on mobile |
| Muted placeholders | `text-white/40 italic` | Nearly invisible "Not set" text |
| Semi-transparent container | `bg-slate-800/60` | Compounds contrast issues |

---

### Design Solution

Switch to a **card-based layout with proper contrast** and readable typography:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  EVENT DETAILS                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  ┌──────────────┐                                               │   │
│  │  │  14 MAGH     │   VENUE: HOME                                 │   │
│  │  │  Pasni Puja  │   Budhanilkanth, Kathmandu  📍               │   │
│  │  └──────────────┘   6:00 AM - 8:00 AM  •  250 guests            │   │
│  │                                                                  │   │
│  │                     PARLOUR: Not set                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Typography Improvements

| Element | Before | After |
|---------|--------|-------|
| Section header | `text-xs text-white/60` | `text-sm font-semibold text-gray-400` |
| Event date | `text-sm font-bold text-emerald-400` | `text-base font-bold text-emerald-400` |
| Event name | `text-xs text-white/70` | `text-sm font-medium text-gray-300` |
| Labels (Venue/Parlour) | `text-xs font-medium` | `text-sm font-semibold` |
| Venue/Parlour name | `text-sm font-semibold text-white` | `text-base font-semibold text-white` |
| Location text | `text-xs text-white/70` | `text-sm text-gray-300` |
| Time range | `text-xs text-emerald-400` | `text-sm font-medium text-emerald-400` |
| "Not set" | `text-xs text-white/40 italic` | `text-sm text-gray-500` (visible but subdued) |

---

### Color Contrast Fixes

**Background:**
- Before: `bg-slate-800/60` (semi-transparent)
- After: `bg-gray-900` (solid, consistent)

**Text Colors (using full opacity or high visibility):**
- Labels: `text-amber-400` / `text-purple-400` (keep brand colors but bump size)
- Content: `text-white` or `text-gray-200` (high contrast)
- Secondary: `text-gray-400` (instead of `text-white/40`)
- Empty states: `text-gray-500` (visible, not invisible)

---

### Visual Enhancements

1. **Card separation**: Each event in its own card with subtle border
2. **Date badge**: Prominent left column with colored background
3. **Better spacing**: Increased gap between elements
4. **Icon sizing**: Bump map icons from `h-3` to `h-4`
5. **Link styling**: Blue links with underline on hover for clarity

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/client-detail/DashboardEventDetails.tsx` | Complete styling overhaul with readable typography |

---

### Implementation Details

```typescript
// Key styling changes:

// Container - solid background, proper border
<div className="bg-gray-900 rounded-xl p-4 mt-4 border border-gray-700">

// Section header - larger, more visible
<h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">

// Event date box - prominent badge style
<div className="bg-emerald-900/50 rounded-lg px-3 py-2 text-center min-w-[100px]">
  <div className="text-base font-bold text-emerald-400">{monthName} {event.eventDay}</div>
  <div className="text-sm text-gray-300 mt-0.5">{event.eventName}</div>
</div>

// Labels - bold and colored
<span className="text-sm font-semibold text-amber-400">Venue:</span>

// Venue name - prominent white text
<span className="text-base font-semibold text-white">{event.venueName}</span>

// Location - readable gray
<span className="text-sm text-gray-300">

// Empty state - visible but subdued
<span className="text-sm text-gray-500">Not set</span>
```

---

### Before vs After Comparison

**Before:**
- Venue label: 12px, amber at 100% opacity
- Venue name: 14px, white at 100% opacity  
- Location: 12px, white at 70% opacity (hard to read!)
- "Not set": 12px, white at 40% opacity (nearly invisible!)

**After:**
- Venue label: 14px, amber, bold
- Venue name: 16px, white, semibold
- Location: 14px, gray-300 (high visibility)
- "Not set": 14px, gray-500 (clearly visible as empty state)

