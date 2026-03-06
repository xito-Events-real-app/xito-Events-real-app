

## Fix: Instant Auto-Save for Deliverables

### Problem
Two bugs prevent data from persisting:
1. **Debounce timers lost on unmount**: When the user switches sections, the component unmounts. Any pending 1-second debounce timers are cleared by React, so changes never reach the database.
2. **Stale `loaded` check**: The `debounceSave` callback guards with `if (!loaded) return`, but due to React closure behavior, early calls may capture `loaded=false` and silently skip saves.

### Solution

**File: `src/components/client-detail/DeliverablesSection.tsx`**

1. **Flush pending saves on unmount**: Add a cleanup effect that iterates all pending `debounceTimers`, clears them, and immediately saves each pending item synchronously (fire-and-forget).

2. **Use a ref for `loaded`**: Replace the `loaded` state check inside `debounceSave` with a `loadedRef` to avoid stale closures.

3. **Save immediately (no debounce) for toggle/switch changes**: For simple on/off toggles (enabled switch), save instantly instead of debouncing — these are quick, discrete actions that should persist immediately.

4. **Reduce debounce to 500ms** for text inputs (names, notes) — still debounced but faster.

### Specific Changes

- Add `const loadedRef = useRef(false)` alongside existing `loaded` state; set both in the load callback.
- Add `const pendingState = useRef<Record<string, ItemState>>({})` to track items waiting for debounce.
- In `debounceSave`: use `loadedRef.current`, and store item in `pendingState.current[key]`.
- Add `useEffect` cleanup that on unmount: flushes all `pendingState` entries by calling `saveDeliverable` directly.
- Reduce debounce from 1000ms to 500ms.

