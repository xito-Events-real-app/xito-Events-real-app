

## Fix Event Selector Dropdown Visibility

The event selection dropdown in the Quick Add form is not visible because the `FormSection` component uses `overflow-hidden` to enable smooth expand/collapse animations. This clips the dropdown when it extends beyond the section boundary.

---

### Root Cause

In `FormSection.tsx` (line 87):
```tsx
<div className="overflow-hidden">
```

This CSS property clips any content that extends beyond the container, including the dropdown list in `EventSelector`.

---

### Solution

Refactor `EventSelector` to use a portal-based dropdown approach using Radix UI's `Popover` component (same pattern used by `FormCombobox`). This ensures the dropdown renders outside the clipping parent.

---

### Implementation

**File: `src/components/form/EventSelector.tsx`**

Replace the inline dropdown with a `Popover` + `PopoverContent`:

1. Import Popover components from Radix UI
2. Wrap the search input in a `PopoverTrigger`
3. Move the dropdown options list inside `PopoverContent`
4. Set high z-index (`z-[9999]`) and explicit `bg-background` to ensure visibility

**Key Changes:**

```tsx
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Replace inline dropdown with:
<Popover open={isOpen} onOpenChange={setIsOpen}>
  <PopoverTrigger asChild>
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        value={searchQuery}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (searchQuery.trim()) {
              handleCustomEvent();
            }
          }
        }}
        placeholder="Search or type event..."
        className="pl-9 h-9 text-sm"
      />
    </div>
  </PopoverTrigger>
  
  <PopoverContent 
    className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999] bg-background border border-border shadow-xl max-h-60 overflow-y-auto" 
    align="start"
    onOpenAutoFocus={(e) => e.preventDefault()}
  >
    {/* Event options list */}
    {filteredOptions.length > 0 ? (
      filteredOptions.map((option, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => handleSelectEvent(option)}
          className={cn(
            "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
            selectedEvent === option && "bg-primary/10 text-primary"
          )}
        >
          {option}
        </button>
      ))
    ) : searchQuery.trim() ? (
      <button
        type="button"
        onClick={handleCustomEvent}
        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add "{searchQuery.trim()}"
      </button>
    ) : (
      <p className="px-3 py-2 text-sm text-muted-foreground">No options available</p>
    )}
  </PopoverContent>
</Popover>
```

---

### Why This Works

- **Portal-based rendering**: `PopoverContent` uses Radix's portal which renders the content at the document body level, completely outside the `overflow-hidden` parent
- **High z-index**: `z-[9999]` ensures it appears above all other UI elements
- **Explicit background**: `bg-background` with solid border prevents transparency issues
- **Width matching**: `w-[var(--radix-popover-trigger-width)]` ensures the dropdown matches the input width

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/form/EventSelector.tsx` | Refactor to use Popover instead of inline dropdown |

---

### Consistency Note

This matches the existing pattern used in:
- `FormCombobox.tsx` (line 113): `PopoverContent className="... z-[9999] bg-background ..."`

---

### Testing Checklist

After implementation:
1. Open the Quick Add form
2. Select a date in the BS Calendar
3. Click on the event search input
4. Verify the dropdown appears above all other content
5. Verify typing filters the options
6. Verify clicking an option selects it
7. Verify the dropdown closes after selection
8. Test on both mobile and desktop views

