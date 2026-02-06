

## Breaking News Section Improvements

### Overview
This plan addresses three requirements for the Breaking News (News) section:
1. **Increase width by 70%** - Remove the current `max-w-lg` constraint
2. **Increase text size** - Make news content more readable
3. **Auto-refresh system** - Refresh on app open + hourly auto-refresh for all activity feeds

---

### Changes

#### File 1: `src/components/suite/SuiteNewsFeed.tsx`

**Width increase (remove max-width constraint)**

| Line | Current | New |
|------|---------|-----|
| 34 | `max-w-lg mx-auto` | Remove constraint or use `max-w-3xl` |

```tsx
// Line 34 - Change from:
<div className="px-4 py-4 pb-24 space-y-6 max-w-lg mx-auto">

// To:
<div className="px-4 py-4 pb-24 space-y-6 w-full max-w-3xl mx-auto">
```

**Day header text size increase**

| Line | Current | New |
|------|---------|-----|
| 40 | `text-xs` | `text-sm` |

---

#### File 2: `src/components/suite/ActivityCard.tsx`

**Increase all text sizes for better readability**

| Line | Current | New |
|------|---------|-----|
| 88 | `text-sm` (client name) | `text-base` |
| 92 | `text-[10px]` (handler badge) | `text-xs` |
| 99 | `text-xs` (description) | `text-sm` |
| 105 | `text-xs` (details) | `text-sm` |
| 113 | `text-[10px]` (time) | `text-xs` |

**Increase padding for larger cards**

| Line | Current | New |
|------|---------|-----|
| 70 | `p-3` | `p-4` |

---

#### File 3: `src/App.tsx`

**Rename `BookedClientsAutoSync` to `GlobalAutoSync` and add full refresh logic**

Current hourly sync only refreshes booked clients. Need to:
1. Add initial refresh on app load (compulsory)
2. Refresh all data sources hourly:
   - Client Tracker (clients-invalidate)
   - Booked Clients (booked-clients-invalidate)

```tsx
// Replace BookedClientsAutoSync with GlobalAutoSync
function GlobalAutoSync() {
  useEffect(() => {
    // Compulsory refresh on app open
    const triggerInitialRefresh = async () => {
      if (navigator.onLine) {
        console.log('[GLOBAL-SYNC] App opened - triggering compulsory refresh');
        // Staggered invalidation to prevent debounce cancellation
        window.dispatchEvent(new CustomEvent('cache-updated', { 
          detail: { type: 'clients-invalidate' } 
        }));
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('cache-updated', { 
            detail: { type: 'booked-clients-invalidate' } 
          }));
        }, 200);
      }
    };
    
    triggerInitialRefresh();
    
    // Hourly auto-refresh
    const syncInterval = setInterval(async () => {
      if (navigator.onLine) {
        console.log('[GLOBAL-SYNC] Hourly refresh triggered');
        window.dispatchEvent(new CustomEvent('cache-updated', { 
          detail: { type: 'clients-invalidate' } 
        }));
        
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('cache-updated', { 
            detail: { type: 'booked-clients-invalidate' } 
          }));
        }, 200);
      }
    }, 60 * 60 * 1000); // 1 hour
    
    return () => clearInterval(syncInterval);
  }, []);
  
  return null;
}
```

---

### Summary

| Component | Change |
|-----------|--------|
| `SuiteNewsFeed.tsx` | Width from `max-w-lg` to `max-w-3xl` (~70% wider), larger day headers |
| `ActivityCard.tsx` | All text sizes increased by 1 step, padding from `p-3` to `p-4` |
| `App.tsx` | Compulsory refresh on app open + hourly refresh for both tracker and booked clients |

### How the refresh works

The refresh system uses cache invalidation events:
- `clients-invalidate` - Triggers `useCachedData` to fetch fresh data from Google Sheets
- `booked-clients-invalidate` - Triggers `useBookedCachedData` to fetch fresh data

Since `useActivityFeed` uses both `useCachedData` and `useBookedCachedData`, refreshing both caches automatically refreshes:
- Breaking News feed
- Handler Activity sections (Benzo, Barun, Nikit)
- Star Clients sections

