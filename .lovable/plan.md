

# Plan: Master Search - Bottom Left + Horizontal Scrollable Recent Searches + Google Sheets Persistence

## Overview

Three major changes to the Master Search feature:
1. **Move to Bottom LEFT** of the dashboard
2. **Persist search history to Google Sheets** (Column S of "CLIENT TRACKER SETUP DATA", rows 2-51, up to 50 searches with FIFO replacement)
3. **Horizontal scrollable recent searches** - Show 10 recent searches in a clean horizontal row with drag-to-scroll for all 50

---

## Visual Layout

### Bottom Left Master Search with Horizontal Recent Searches
```text
+----------+------------------------------------------+
|  LEFT    |                                          |
|  SIDEBAR |  MAIN CONTENT AREA                       |
|          |                                          |
|          |  [Events] [Benzo] [Barun] [Nikit]        |
|          |  ┌────────────────────────────────────┐  |
|          |  │  Tab Content                       │  |
|          |  └────────────────────────────────────┘  |
|          |                                          |
+----------+------------------------------------------+
|                                                     |
|  ┌─────────────────────────────────────────────────┐|
|  │ [🔍 Master Search Input]                        │|
|  └─────────────────────────────────────────────────┘|
|                                                     |
|  Recent: [Benzo] [Wedding] [Kathmandu] [Mehndi] ➜  |
|          ↑ Horizontal scroll for more              |
+----------------------------------------------------|
```

---

## Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/suite/SuiteDashboardContent.tsx` | UPDATE | Move Master Search from `right-6` to `left-6` |
| `src/components/suite/MasterSearchButton.tsx` | UPDATE | Horizontal scrollable recent searches + Google Sheets integration |
| `supabase/functions/google-sheets/index.ts` | UPDATE | Add `getSearchHistory` and `saveSearchQuery` actions |
| `tailwind.config.ts` | UPDATE | Add new animations for fast slide-in effects |

---

## Implementation Details

### 1. Move Master Search to Bottom Left

Update positioning in `SuiteDashboardContent.tsx`:

**Line 84 - Change from:**
```tsx
<div className="absolute bottom-6 right-6 w-80 z-10">
```

**To:**
```tsx
<div className="absolute bottom-6 left-6 w-80 z-10">
```

---

### 2. Add Animations to Tailwind Config

Add new keyframes for fast, smooth animations:

```typescript
keyframes: {
  // ... existing keyframes ...
  "slide-in-right": {
    "0%": { opacity: "0", transform: "translateX(-20px)" },
    "100%": { opacity: "1", transform: "translateX(0)" },
  },
  "pop-in": {
    "0%": { opacity: "0", transform: "scale(0.8)" },
    "100%": { opacity: "1", transform: "scale(1)" },
  },
},
animation: {
  // ... existing animations ...
  "slide-in-right": "slide-in-right 0.2s ease-out",
  "pop-in": "pop-in 0.15s ease-out",
},
```

---

### 3. Add Google Sheets Functions for Search History

Add two new functions to the edge function:

**Get Search History:**
```typescript
async function getSearchHistory(accessToken: string, spreadsheetId: string) {
  const range = encodeURIComponent("'CLIENT TRACKER SETUP DATA'!S2:S51");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) return [];

  const data = await response.json();
  if (!data.values) return [];
  
  return data.values.map((row: string[]) => row[0]).filter(Boolean);
}
```

**Save Search Query (FIFO - 50 max):**
```typescript
async function saveSearchQuery(accessToken: string, spreadsheetId: string, query: string) {
  if (!query?.trim()) return { success: false };
  
  // Get current history
  const currentHistory = await getSearchHistory(accessToken, spreadsheetId);
  
  // Remove duplicate (case-insensitive)
  const filtered = currentHistory.filter(
    (q: string) => q.toLowerCase() !== query.toLowerCase()
  );
  
  // Add new search at beginning, limit to 50
  const newHistory = [query.trim(), ...filtered].slice(0, 50);
  
  // Pad to 50 rows
  const values = Array(50).fill(['']);
  newHistory.forEach((q, i) => { values[i] = [q]; });
  
  // Write to S2:S51
  const range = encodeURIComponent("'CLIENT TRACKER SETUP DATA'!S2:S51");
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  
  await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  });

  return { success: true, history: newHistory };
}
```

**Add action cases:**
```typescript
case 'getSearchHistory':
  result = await getSearchHistory(accessToken, spreadsheetId);
  break;
case 'saveSearchQuery':
  if (!data || !data.query) throw new Error('query is required');
  result = await saveSearchQuery(accessToken, spreadsheetId, data.query as string);
  break;
```

---

### 4. Redesign MasterSearchButton with Horizontal Recent Searches

**Key Changes:**
- Replace localStorage with Google Sheets API calls
- Increase MAX_RECENT from 10 to 50
- When collapsed: Show button
- When expanded: Show input + horizontal scrollable chip row below

**New UI Structure (Expanded State):**
```tsx
<div ref={containerRef} className="relative">
  {/* Search Input */}
  <div className="relative">
    <Input ... />
  </div>
  
  {/* Horizontal Recent Searches - ALWAYS visible when expanded & no query */}
  {query.trim().length < 2 && recentSearches.length > 0 && (
    <div className="mt-3">
      <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
        <Clock className="w-3 h-3" /> Recent
      </p>
      
      {/* Horizontal Scroll Container */}
      <div 
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide cursor-grab active:cursor-grabbing"
        style={{ scrollBehavior: 'smooth' }}
      >
        {recentSearches.map((item, i) => (
          <button
            key={i}
            onClick={() => handleRecentClick(item.query)}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-full text-sm font-medium",
              "bg-gradient-to-r from-violet-100 to-purple-100",
              "text-violet-700 border border-violet-200",
              "hover:from-violet-200 hover:to-purple-200",
              "transition-all duration-150",
              "animate-pop-in",
              // Staggered animation delay
              i < 10 ? `animation-delay-${i * 50}` : ''
            )}
            style={{ animationDelay: `${i * 30}ms` }}
          >
            {item.query}
          </button>
        ))}
      </div>
    </div>
  )}
  
  {/* Search Results Dropdown - appears ABOVE the chips when typing */}
  {query.trim().length >= 2 && results.length > 0 && (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-2xl shadow-xl ...">
      {/* Results list */}
    </div>
  )}
</div>
```

**Loading State:**
Show skeleton chips while fetching from Google Sheets:
```tsx
{isLoadingHistory && (
  <div className="flex gap-2 mt-3">
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} className="h-8 w-20 rounded-full bg-gray-200 animate-pulse" />
    ))}
  </div>
)}
```

---

### 5. CSS for Horizontal Scroll

Add to the component or global CSS:
```css
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

Or use Tailwind utility (add to index.css if needed).

---

## Data Flow

```text
App Loads → MasterSearchButton mounts
                │
                ▼
   API Call: getSearchHistory
                │
                ▼
   Display horizontal chips (50 max, 10 visible initially)
                │
   User searches and clicks result
                │
                ▼
   1. Navigate to client detail
   2. API Call: saveSearchQuery (fire & forget)
                │
                ▼
   Column S in "CLIENT TRACKER SETUP DATA" updated:
   S2 = Most recent search
   S51 = 50th (oldest) search
   
   If 51st search added → Row 2 gets new search,
   all shift down, S51 old value dropped (FIFO)
```

---

## Google Sheets Structure

**Sheet: CLIENT TRACKER SETUP DATA**
**Column S: Search History (rows 2-51 = 50 slots)**

| Row | Column S Value |
|-----|----------------|
| 1   | Header (SEARCH HISTORY) |
| 2   | Most recent search |
| 3   | 2nd most recent |
| ... | ... |
| 51  | 50th (oldest) search |

---

## UI Specifications

### Recent Search Chips
- **Style**: Gradient violet-100 to purple-100 background
- **Border**: Violet-200
- **Text**: Violet-700, 14px, medium weight
- **Padding**: px-3 py-1.5
- **Shape**: rounded-full (pill)
- **Animation**: Pop-in with staggered delays (30ms per chip)
- **Scroll**: Horizontal drag-to-scroll, hide scrollbar

### Search Results
- Appear ABOVE the input (bottom-full) when typing
- No overlap with recent search chips
- Same design as current

### Collapsed Button
- Bottom LEFT corner (was right)
- Same gradient and glow animation

---

## Benefits

1. **Team-Wide History**: All users share the same 50 recent searches from Google Sheets
2. **Fast Visual Feedback**: Chips appear with quick pop-in animations
3. **Clean UI**: No overlapping - results above input, chips below
4. **Easy Discovery**: See 10 chips immediately, scroll for 40 more
5. **Persistent**: Survives browser clears, device switches, app reinstalls

---

## Expected Result

1. Master Search button appears at **bottom-left** corner
2. When expanded, shows input field with horizontal scrollable recent search chips below
3. Chips animate in quickly with staggered pop-in effect
4. User can drag-scroll to see all 50 recent searches
5. Clicking a chip fills the search input
6. Search results appear ABOVE the input without covering chips
7. All searches are saved to Column S in Google Sheets with FIFO replacement at 50

