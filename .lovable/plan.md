

# Plan: Master Search Feature for Xito Business Suite

## Overview

Add a powerful inline search feature below the "Master Sync" button on the Suite landing page. The search will feature an animated button with a glowing "24 hrs" effect, show the last 10 recent searches, and allow direct inline typing without popups.

---

## Requirements Summary

| Requirement | Implementation |
|-------------|----------------|
| Location | Below Master Sync button |
| Animation | Glowing/pulsing gradient effect like "24 hrs" |
| Recent searches | Show last 10 searches (persisted in localStorage) |
| Input behavior | Direct inline typing - no modal/popup |
| Search scope | Universal search across all client data |

---

## Component Architecture

```text
SuiteHomeContent / DesktopSuiteLanding
    |
    +-- SuiteQuickAdd (Add Client / Add Payment buttons)
    +-- MasterSyncButton (existing)
    +-- MasterSearchButton (NEW)
            |
            +-- Collapsed: Gradient button with search icon + animation
            +-- Expanded: Inline input + recent searches dropdown
```

---

## Technical Implementation

### File 1: NEW - `src/components/suite/MasterSearchButton.tsx`

Create a new component with the following features:

**State Management:**
- `isExpanded` - toggle between button and input mode
- `query` - current search input
- `recentSearches` - array of last 10 searches from localStorage

**UI Modes:**

1. **Collapsed Mode (Button)**
   - Gradient button matching Master Sync aesthetic
   - Search icon with glowing pulse animation
   - "Master Search" label
   - Click expands to input mode

2. **Expanded Mode (Inline Input)**
   - Input field with auto-focus
   - Recent searches dropdown (if query is empty)
   - Search results preview (when typing)
   - Clear/close button
   - Click outside or ESC collapses

**Recent Searches:**
- Store in localStorage key: `xito_recent_searches`
- Max 10 items, newest first
- Each item: `{ query: string, timestamp: number }`
- Add to history when user presses Enter or clicks a result

**Search Logic:**
- Reuse existing universal search logic from `src/pages/Search.tsx`
- Use `useCachedData()` to access client data
- Show top 5 results as preview
- Navigate to client detail on result click

**Animation:**
- Use a glowing border animation similar to the provided context
- Pulse effect on the search icon
- Smooth expand/collapse transitions

---

### File 2: Update `src/components/suite/SuiteHomeContent.tsx`

Add the new MasterSearchButton below MasterSyncButton:

```text
<SuiteQuickAdd />
<MasterSyncButton />
<MasterSearchButton />  <- NEW
<TodayEventsHero />
```

---

### File 3: Update `src/components/suite/DesktopSuiteLanding.tsx`

Add the MasterSearchButton in the Quick Actions column:

```text
<h3>Quick Actions</h3>
<SuiteQuickAdd />
<MasterSyncButton />
<MasterSearchButton />  <- NEW
```

---

### File 4: Update `tailwind.config.ts`

Add new keyframes for the glowing effect:

```typescript
keyframes: {
  // ... existing keyframes
  "glow-pulse": {
    "0%, 100%": { 
      boxShadow: "0 0 5px rgba(139, 92, 246, 0.5), 0 0 20px rgba(139, 92, 246, 0.3)" 
    },
    "50%": { 
      boxShadow: "0 0 20px rgba(139, 92, 246, 0.8), 0 0 40px rgba(139, 92, 246, 0.5)" 
    },
  },
  "border-glow": {
    "0%, 100%": { borderColor: "rgba(139, 92, 246, 0.5)" },
    "50%": { borderColor: "rgba(139, 92, 246, 1)" },
  },
},
animation: {
  // ... existing animations
  "glow-pulse": "glow-pulse 2s ease-in-out infinite",
  "border-glow": "border-glow 2s ease-in-out infinite",
},
```

---

### File 5: Update `src/components/suite/index.ts`

Export the new component:

```typescript
export { MasterSearchButton } from './MasterSearchButton';
```

---

## Detailed Component Code Structure

### MasterSearchButton.tsx

```typescript
// Imports
import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Clock, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCachedData } from "@/hooks/useCachedData";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ClientData, getCurrentStatus } from "@/lib/sheets-api";
import { getClientDetailPath } from "@/lib/client-navigation";

// Constants
const STORAGE_KEY = "xito_recent_searches";
const MAX_RECENT = 10;
const MAX_PREVIEW_RESULTS = 5;

// Types
interface RecentSearch {
  query: string;
  timestamp: number;
}

// Component
export function MasterSearchButton() {
  // State
  const [isExpanded, setIsExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Hooks
  const navigate = useNavigate();
  const { clients } = useCachedData();
  
  // Load recent searches from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setRecentSearches(JSON.parse(stored));
    }
  }, []);
  
  // Auto-focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);
  
  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
        setQuery("");
      }
    };
    
    if (isExpanded) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpanded]);
  
  // Search results (reuse logic from Search.tsx)
  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    // ... universal search logic
    return filteredResults.slice(0, MAX_PREVIEW_RESULTS);
  }, [query, clients]);
  
  // Save search to history
  const saveSearch = (searchQuery: string) => {
    const newSearch = { query: searchQuery, timestamp: Date.now() };
    const updated = [
      newSearch,
      ...recentSearches.filter(s => s.query !== searchQuery)
    ].slice(0, MAX_RECENT);
    
    setRecentSearches(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };
  
  // Handle result click
  const handleResultClick = (client: ClientData) => {
    saveSearch(query);
    navigate(getClientDetailPath(client));
    setIsExpanded(false);
    setQuery("");
  };
  
  // Handle recent search click
  const handleRecentClick = (searchQuery: string) => {
    setQuery(searchQuery);
    saveSearch(searchQuery);
  };
  
  // Render collapsed button or expanded input
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          "w-full h-14 rounded-full font-semibold flex items-center justify-center gap-3",
          "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600",
          "text-white shadow-lg transition-all",
          "hover:scale-[1.02] active:scale-[0.98]",
          "animate-glow-pulse"
        )}
      >
        <Search className="w-5 h-5 animate-pulse" />
        Master Search
      </button>
    );
  }
  
  return (
    <div ref={containerRef} className="relative">
      {/* Inline Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-violet-500" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients, events, handlers..."
          className={cn(
            "h-14 pl-12 pr-12 rounded-full text-base",
            "border-2 border-violet-400 focus:border-violet-500",
            "animate-border-glow"
          )}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsExpanded(false);
              setQuery("");
            }
          }}
        />
        <button
          onClick={() => { setIsExpanded(false); setQuery(""); }}
          className="absolute right-4 top-1/2 -translate-y-1/2"
        >
          <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
        </button>
      </div>
      
      {/* Dropdown: Recent Searches or Results */}
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border z-50 max-h-80 overflow-y-auto">
        {query.trim().length < 2 && recentSearches.length > 0 && (
          // Show recent searches
          <div className="p-3">
            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Recent Searches
            </p>
            {recentSearches.map((item, i) => (
              <button key={i} onClick={() => handleRecentClick(item.query)}>
                {item.query}
              </button>
            ))}
          </div>
        )}
        
        {query.trim().length >= 2 && results.length > 0 && (
          // Show search results
          <div className="p-2">
            {results.map((client, i) => (
              <button key={i} onClick={() => handleResultClick(client)}>
                {client.clientName}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## User Flow

```text
1. User sees "Master Search" button below Master Sync
   |
   v
2. User clicks button
   |
   v
3. Button transforms into inline input (auto-focused)
   |
   +-- If empty: Shows last 10 recent searches
   |
   +-- If typing: Shows top 5 matching results
   |
   v
4a. User clicks a result -> Navigates to client detail
    (search saved to history)
   |
4b. User clicks recent search -> Populates input, shows results
   |
4c. User clicks outside or presses ESC -> Collapses back to button
```

---

## Summary of Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/suite/MasterSearchButton.tsx` | CREATE - New search component |
| `src/components/suite/SuiteHomeContent.tsx` | UPDATE - Add MasterSearchButton |
| `src/components/suite/DesktopSuiteLanding.tsx` | UPDATE - Add MasterSearchButton |
| `src/components/suite/index.ts` | UPDATE - Export new component |
| `tailwind.config.ts` | UPDATE - Add glow animations |

---

## Animation Preview

The button will have a glowing purple effect that pulses continuously, similar to:

```css
/* Glow effect */
box-shadow: 0 0 20px rgba(139, 92, 246, 0.6);
animation: glow-pulse 2s ease-in-out infinite;
```

When expanded, the input border will have a subtle animated glow to indicate active state.

