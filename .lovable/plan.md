
# Fix: Select Dropdowns Not Opening Inside Drawer

## Root Cause

The previous fix raised the Drawer's z-index to `z-[200]` (to appear above the Sheet at `z-[150]`). However, the `SelectContent` component in `select.tsx` renders via a **Portal** at `z-50`. This means the dropdown list appears behind the Drawer's overlay, making it invisible and unclickable.

The same issue affects the Dialog component's Select dropdowns used in the PaymentHistorySheet edit form.

## Fix

**File: `src/components/ui/select.tsx`**
- Change `SelectContent`'s z-index from `z-50` to `z-[300]`
- This ensures Select dropdowns always render above Drawers (`z-[200]`), Sheets (`z-[150]`), and Dialogs (`z-[200]`)

This is a single-line change in the className of `SelectContent` (line 68), updating `z-50` to `z-[300]`.

## Z-Index Hierarchy After Fix

```text
z-50    -- Default overlays (tooltips, popovers)
z-[150] -- Sheet overlay + content
z-[200] -- Drawer overlay + content, Dialog overlay + content
z-[300] -- Select dropdown content (always on top)
```

## Risk

Minimal. Select dropdowns should always be the topmost interactive element since they are transient and dismiss on selection. No other component needs to render above an open Select.
