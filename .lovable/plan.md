
## Netflix-Style Xito Business Suite Landing Page Redesign

This plan transforms the Suite Landing page into a visually stunning, Netflix-inspired dashboard with quick actions, today's event hero, and module cards featuring recent activity statements.

---

### Overview

```text
CURRENT LAYOUT:
+----------------------------------+
| Header (Logo + Title)            |
+----------------------------------+
| Active Modules (cards)           |
| Coming Soon Modules (grid)       |
| Footer                           |
+----------------------------------+

NEW LAYOUT:
+----------------------------------+
| Header (Logo + Quick Add CTAs)   |
+----------------------------------+
| Hero Section: Today's Events     |
+----------------------------------+
| Active Module Cards (Netflix)    |
| - Module name, stats, activity   |
+----------------------------------+
| [Scroll to see more...]          |
| Coming Soon Modules (hidden)     |
| Footer                           |
+----------------------------------+
```

---

### New Components to Create

#### 1. SuiteLandingQuickAdd Component
**Purpose:** Quick access to "Add Client" and "Add Payment" actions from the landing page

**Features:**
- Two prominent gradient buttons side by side
- "Add Client" opens a modal/drawer with the QuickAdd form
- "Add Payment" opens a modal that first lists booked clients, then the PaymentDrawer for the selected client
- Consistent dark theme styling

**File:** `src/components/suite/SuiteLandingQuickAdd.tsx`

---

#### 2. TodayEventsHero Component
**Purpose:** Prominent hero section showing today's booked events

**Features:**
- Full-width gradient banner (Netflix-style dark gradient)
- Large title: "Today's Events" or "No Events Today"
- List of today's booked clients with clickable names
- Client names link to `/client-tracker/client/{rowNumber}`
- Countdown timer or "LIVE NOW" badge for ongoing events
- Fallback: Show "No events scheduled for today" with subtle animation

**Data Source:** Uses `useBookedCachedData` hook to fetch booked clients, filter by today's date using `eventDateAD`

**File:** `src/components/suite/TodayEventsHero.tsx`

---

#### 3. ModuleCard Component (Enhanced)
**Purpose:** Netflix-style module cards with statistics and recent activity

**Features:**
- Large gradient banner background (like Netflix movie cards)
- Module icon prominently displayed
- Module name and description
- **Stats Section:** 
  - Client Tracker: "X active leads"
  - Booked Clients: "X upcoming events"
  - Finance Manager: "NPR X collected today/this month"
  - Vendors: "X vendors listed"
  - My Accounts: "X accounts saved"
- **Recent Activity Statement:**
  - Client Tracker: "Last client: [name] added 2h ago"
  - Booked Clients: "Next event: [name] in 3 days"
  - Finance Manager: "Last payment: NPR 50,000 from [name]"
  - Vendors: "Last added: [vendor name]"
  - My Accounts: "Recently viewed: [account type]"
- Hover effects with subtle scale and glow
- Click navigates to module

**File:** `src/components/suite/ModuleCard.tsx`

---

### Implementation Changes

#### 1. Update `src/lib/suite-modules.ts`
Add optional `statsKey` field to each module for fetching relevant statistics:
```typescript
export interface SuiteModule {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  path: string;
  status: "active" | "coming-soon";
  gradient: string;
  statsKey?: 'clients' | 'booked' | 'finance' | 'vendors' | 'accounts';
}
```

---

#### 2. Create `src/components/suite/SuiteLandingQuickAdd.tsx`
```typescript
// Quick Add buttons for Client and Payment
// Uses existing QuickAdd form logic
// Uses existing PaymentDrawer component
// Opens in Drawer/Modal for seamless UX
```

**Dependencies:**
- Drawer component from UI
- QuickAdd form logic (inline or modal)
- PaymentDrawer from finance module
- useBookedCachedData for client selection

---

#### 3. Create `src/components/suite/TodayEventsHero.tsx`
```typescript
// Fetches booked clients
// Filters to today's events using eventDateAD
// Displays client names as clickable links
// Netflix-style gradient background
// Animation for "LIVE" indicator
```

**Logic for Today's Events:**
```typescript
const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

const todayEvents = bookedClients.filter(client => {
  // Check if any event date matches today
  const eventDates = client.eventDateAD?.split('\n') || [];
  return eventDates.some(date => date.startsWith(todayStr));
});
```

---

#### 4. Create `src/components/suite/ModuleCard.tsx`
```typescript
// Enhanced module card with Netflix styling
// Receives module data + optional stats
// Displays gradient banner, icon, name, description
// Shows statistics and recent activity statement
// Hover effects and click navigation
```

**Card Structure:**
```text
+----------------------------------------+
| [Gradient Banner with Icon]            |
|                                        |
| MODULE NAME                            |
| Description text                       |
|                                        |
| Stats: 45 active leads                 |
| Last: Client XYZ added 2h ago          |
+----------------------------------------+
```

---

#### 5. Update `src/components/suite/MobileSuiteLanding.tsx`

**Changes:**
- Add GlobalModeToggle at top
- Add SuiteLandingQuickAdd (two buttons)
- Add TodayEventsHero section
- Replace current module list with enhanced ModuleCard components
- Move "Coming Soon" section below the fold (user must scroll to see)
- Remove Coming Soon from initial viewport
- Add dark theme gradient background matching other modules
- Footer remains at bottom

**Layout Flow:**
1. Header with Logo + Quick Add buttons
2. Today's Events Hero (full-width gradient)
3. Active Modules as Netflix-style cards
4. Spacer/separator
5. Coming Soon section (below fold)
6. Footer

---

#### 6. Update `src/components/suite/DesktopSuiteLanding.tsx`

**Same changes as mobile but with:**
- 3-column grid for module cards
- Larger hero section
- Side-by-side quick add buttons with more padding
- Coming Soon in 4-column grid at bottom

---

#### 7. Create Custom Hook: `src/hooks/useSuiteStats.ts`

**Purpose:** Fetch statistics for all modules in a single hook

**Returns:**
```typescript
{
  clients: { total: number; today: number; lastClient?: string; lastAddedTime?: string };
  booked: { total: number; upcoming: number; nextEvent?: string; daysUntil?: number };
  finance: { collected: number; pending: number; lastPayment?: string; lastAmount?: number };
  vendors: { total: number; lastAdded?: string };
  accounts: { total: number };
  isLoading: boolean;
}
```

**Data Sources:**
- `useCachedData()` for client tracker data
- `useBookedCachedData()` for booked clients
- Vendor data from vendor API
- Account data from accounts API

---

### Visual Design Specifications

#### Theme Colors (Matching App)
- Background: `bg-slate-900` to `bg-slate-950` gradient
- Card backgrounds: `bg-slate-800/80` with blur
- Primary gradient: Emerald to Teal
- Accent gradients per module (already defined in suite-modules.ts)

#### Hero Section Styling
```css
/* Netflix-style gradient */
background: linear-gradient(to right, 
  rgba(15, 23, 42, 0.95) 0%,
  rgba(15, 23, 42, 0.8) 50%,
  rgba(15, 23, 42, 0.4) 100%
);
```

#### Card Hover Effects
```css
.module-card:hover {
  transform: scale(1.03);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}
```

---

### File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/suite/SuiteLandingQuickAdd.tsx` | Create | Quick Add Client + Payment buttons |
| `src/components/suite/TodayEventsHero.tsx` | Create | Today's events hero section |
| `src/components/suite/ModuleCard.tsx` | Create | Enhanced Netflix-style module card |
| `src/hooks/useSuiteStats.ts` | Create | Statistics aggregation hook |
| `src/components/suite/MobileSuiteLanding.tsx` | Modify | Integrate new components |
| `src/components/suite/DesktopSuiteLanding.tsx` | Modify | Integrate new components |
| `src/lib/suite-modules.ts` | Modify | Add statsKey to modules |
| `src/components/suite/index.ts` | Modify | Export new components |

---

### Technical Details

#### Quick Add Client Integration
The Quick Add button will open a Drawer containing a simplified version of the QuickAdd form:
- Reuse existing form logic from `src/pages/QuickAdd.tsx`
- Extract form into reusable component if needed
- On success, show toast and close drawer

#### Quick Add Payment Flow
1. User clicks "Add Payment"
2. Drawer opens with searchable list of booked clients
3. User selects a client
4. PaymentDrawer opens for that client (same one from Finance Manager)
5. Payment is recorded (syncs to WTN INCOME & EXPENSES as implemented)

#### Today's Events Click Navigation
Client names in the hero section link to:
```typescript
navigate(`/client-tracker/client/${client.rowNumber}`);
// or using registeredDateTimeAD for universal ID resolution
```

#### Recent Activity Data
For "recent activity" statements:
- Parse `registeredDateTimeAD` for last added client
- Calculate time difference for "X hours ago" display
- Use cached data for performance

---

### Coming Soon Section Placement

To hide Coming Soon below the fold:
```tsx
{/* Spacer to push Coming Soon below viewport */}
<div className="min-h-[100px]" />

{/* Coming Soon - only visible after scrolling */}
<div className="space-y-4 pt-8 border-t border-slate-700/50">
  <h3>Coming Soon</h3>
  {/* Coming soon module grid */}
</div>
```

---

### Accessibility & Performance

- All clickable elements have proper `aria-labels`
- Lazy load module statistics
- Use skeleton loaders while data loads
- Maintain touch-friendly tap targets (44px minimum)
- Ensure sufficient color contrast for text

---

### Testing Checklist

After implementation:
1. Test Quick Add Client flow end-to-end
2. Test Quick Add Payment with client selection
3. Verify Today's Events shows correct clients
4. Verify client name clicks navigate correctly
5. Check Coming Soon is hidden initially on mobile
6. Verify all module cards display correct stats
7. Test dark theme consistency across all sections
8. Test responsive layout on various screen sizes
