

# Fix: Hide Admin-Only Features on Public Routes

## Problem
All admin features (SaugatSearch, FloatingXitoTransfer, FloatingBookingCalendar, FloatingBenzoKeep, FloatingYouTubePlayer, upload trackers, announcements) render globally — including on public routes like `/client-portal`, `/crew-schedule`, `/editor-portal`, and `/client-form`. This leaks internal data to external users.

## Solution
Create a single wrapper component `AdminOnlyFeatures` that checks the current route path. If the route is public, it renders nothing. Otherwise it renders all admin-only floating components and trackers.

### Public route prefixes to block:
- `/client-portal`
- `/crew-schedule`
- `/editor-portal`
- `/client-form`
- `/login`

## Changes

### 1. `src/App.tsx` — Extract admin features into gated wrapper

Create an `AdminOnlyFeatures` component inside App.tsx (same pattern as `AuthenticatedStartupPopup`):

```typescript
function AdminOnlyFeatures() {
  const { user } = useAuthContext();
  const pathname = window.location.pathname;
  const isPublicRoute = 
    pathname.startsWith('/client-portal') || 
    pathname.startsWith('/crew-schedule') || 
    pathname.startsWith('/editor-portal') || 
    pathname.startsWith('/client-form') ||
    pathname.startsWith('/login');
  
  if (!user || isPublicRoute) return null;
  
  return (
    <>
      <WtnFilesAnnouncement />
      <AuthenticatedStartupPopup />
      <SaugatSearch />
      <FloatingBookingCalendar />
      <FloatingBenzoKeep />
      <FloatingYouTubePlayer />
      <FloatingXitoTransfer />
      <UploadProgressTracker />
      <PCloudUploadTracker />
      <XitoUploadTracker />
      <YouTubeUploadTracker />
    </>
  );
}
```

Replace the individual renders (lines 94–106) with a single `<AdminOnlyFeatures />`.

### 2. `src/contexts/SaugatSearchContext.tsx` — Disable keyboard listener on public routes

The double-space listener fires even without `SaugatSearch` rendered (context + listener are still active). Add a route check inside the keydown handler to skip on public routes.

### 3. `src/contexts/XitoTransferPopupContext.tsx` — Same fix

The double-X listener also fires on public routes. Add the same public route guard inside the keydown handler.

### 4. `src/contexts/BookingCalendarPopupContext.tsx` — Check for similar shortcut

If it has a global keyboard shortcut, add the same guard.

| File | Change |
|------|--------|
| `src/App.tsx` | Wrap admin-only components in route-gated wrapper |
| `src/contexts/SaugatSearchContext.tsx` | Skip keydown on public routes |
| `src/contexts/XitoTransferPopupContext.tsx` | Skip keydown on public routes |
| `src/contexts/BookingCalendarPopupContext.tsx` | Skip keydown on public routes (if applicable) |

