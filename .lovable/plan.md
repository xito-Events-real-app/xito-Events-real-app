

## Fix: Always Show Client Notes Section

The "Client Notes" section (description) sometimes doesn't appear because the code conditionally renders it only when `client.description` has a truthy value. When the description is empty or contains only whitespace, the section is hidden entirely.

---

### Root Cause

In `ClientHeroSection.tsx` at line 242:
```tsx
{client.description && (
  <div className="bg-gradient-to-r ...">
    ...Client Notes...
  </div>
)}
```

When `client.description` is:
- Empty string `""`
- `null` or `undefined`
- Only whitespace

The entire Client Notes box doesn't render at all.

---

### Solution

Always render the Client Notes section, but show a placeholder message when there's no description.

**Before:**
```tsx
{client.description && (
  <div className="...">Client Notes content</div>
)}
```

**After:**
```tsx
<div className="...">
  {client.description?.trim() 
    ? formatDescription(client.description) 
    : <span className="text-white/40 italic">No notes added</span>
  }
</div>
```

---

### File to Modify

| File | Changes |
|------|---------|
| `src/components/client-detail/ClientHeroSection.tsx` | Remove conditional, always show section with fallback text |

---

### Visual Change

**Current (Hidden when empty):**
```
[Quotation Section]
[Event Details]
<nothing here if no description>
```

**After (Always visible):**
```
[Quotation Section]
[Event Details]
┌─────────────────────────────────────────────────┐
│ " CLIENT NOTES                                  │
│   No notes added                                │
│                                               " │
└─────────────────────────────────────────────────┘
```

---

### Technical Details

The fix involves:
1. Removing the `{client.description && (...)}` wrapper
2. Adding a ternary inside the content area to show either:
   - The formatted description (if exists and not just whitespace)
   - An italicized "No notes added" placeholder

