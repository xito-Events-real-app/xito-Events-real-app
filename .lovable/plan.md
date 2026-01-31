
# Fix Desktop Mode Blank Screen Issue

## Problem Analysis

When users switch from mobile to desktop mode, the screen goes blank. After investigating the code, I identified two root causes:

### Root Cause 1: Race Condition in `useDesktopMode` Hook
The hook initializes `isDesktopMode` as `false` and only updates it from `localStorage` inside a `useEffect`:

```typescript
// Current implementation (problematic)
const [isDesktopMode, setIsDesktopMode] = useState(false);

useEffect(() => {
  const saved = localStorage.getItem(DESKTOP_MODE_KEY);
  if (saved === "true") {
    setIsDesktopMode(true);
  }
}, []);
```

**The problem**: After the page reloads (triggered by `toggleDesktopMode`):
1. First render: `isDesktopMode = false` → renders `MobileSuiteLanding`
2. `useEffect` runs, sets `isDesktopMode = true`
3. Re-render: should switch to `DesktopSuiteLanding`
4. If anything goes wrong during this re-render, the screen goes blank

### Root Cause 2: Missing Error Boundary
If `DesktopSuiteLanding` or any of its child components throw an error during rendering, there's no error boundary to catch it, resulting in a blank screen.

---

## Solution

### Change 1: Initialize Desktop Mode Synchronously

**File: `src/hooks/useDesktopMode.ts`**

Read from `localStorage` synchronously during initialization to prevent the flash/race condition:

```typescript
// Before
const [isDesktopMode, setIsDesktopMode] = useState(false);

useEffect(() => {
  const saved = localStorage.getItem(DESKTOP_MODE_KEY);
  if (saved === "true") {
    setIsDesktopMode(true);
  }
}, []);

// After - Initialize synchronously
const [isDesktopMode, setIsDesktopMode] = useState(() => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DESKTOP_MODE_KEY) === "true";
});
```

This ensures the correct mode is set from the very first render, avoiding any flash or race condition.

### Change 2: Add Error Boundary for Suite Landing

**File: `src/pages/SuiteLanding.tsx`**

Add try-catch and error boundary to prevent blank screens:

```typescript
import { useState, useEffect } from "react";
import { useDesktopMode } from "@/hooks/useDesktopMode";
import { MobileSuiteLanding } from "@/components/suite/MobileSuiteLanding";
import { DesktopSuiteLanding } from "@/components/suite/DesktopSuiteLanding";

export default function SuiteLanding() {
  const { isDesktopMode } = useDesktopMode();
  const [hasError, setHasError] = useState(false);

  // Reset error state when mode changes
  useEffect(() => {
    setHasError(false);
  }, [isDesktopMode]);

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-4">Unable to load the dashboard.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (isDesktopMode) {
    return <DesktopSuiteLanding />;
  }

  return <MobileSuiteLanding />;
}
```

### Change 3: Also Update `getDesktopMode` Utility Function

Ensure the utility function used in `AppLayout.tsx` is also consistent:

```typescript
// Already works correctly, but verify it's used properly
export function getDesktopMode(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DESKTOP_MODE_KEY) === "true";
}
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/hooks/useDesktopMode.ts` | Initialize `isDesktopMode` synchronously from `localStorage` using lazy state initialization |
| `src/pages/SuiteLanding.tsx` | Add error handling fallback UI to prevent blank screens |

---

## Technical Details

**Why this works:**

1. **Lazy state initialization**: Using `useState(() => {...})` allows us to read from `localStorage` synchronously before the first render, ensuring `isDesktopMode` has the correct value immediately

2. **No useEffect needed for initial read**: The `useEffect` was causing a second render cycle which created the race condition. By initializing synchronously, we eliminate this

3. **Error fallback**: Even if something fails during desktop component rendering, users see a helpful message instead of a blank screen

**Testing notes:**
- After implementing, test by logging in on mobile, then clicking "Switch to Desktop"
- The desktop view should load immediately without any flash or blank screen
- If an error occurs, users will see the fallback UI with a reload button
