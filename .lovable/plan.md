

# Plan: Redesign Xito Business Suite Landing Page - Professional Dashboard Layout

## Overview

Transform the current scattered landing page into a professional dashboard-style interface with:
- **Left Sidebar Navigation** - Active modules + Coming Soon in separate tabs
- **Top Quick Actions Bar** - Properly aligned quick actions
- **Main Content Area** - Clean dashboard content
- **Right News Panel** (Desktop) - Breaking News sidebar

---

## Current Problems

1. **Mobile View**: Everything is stacked vertically in one long scrollable list - Quick Add, Sync, Search, Events, Modules, Handler Activity, Coming Soon
2. **Desktop View**: Similar layout but wider - still feels cluttered
3. **No clear navigation structure** - modules are mixed with actions
4. **Coming Soon clutters the main view** - should be separated

---

## New Layout Architecture

### Mobile View

```text
+------------------------------------------+
|  HEADER (Logo + Title + Logout)          |
+------------------------------------------+
|                                          |
|  QUICK ACTIONS BAR (Horizontal)          |
|  [Add Client] [Add Payment] [Search]     |
|                                          |
+------------------------------------------+
|                                          |
|  MAIN CONTENT (Scrollable)               |
|  - Upcoming Events Hero                  |
|  - Active Module Cards (Grid 2-col)      |
|  - Handler Activity Grid                 |
|                                          |
+------------------------------------------+
|  BOTTOM NAV: [Modules] [Coming Soon]     |
+------------------------------------------+
```

### Desktop View

```text
+----------+----------------------------------+------------+
|          |  HEADER BAR                       | Actions   |
|          |  Logo | Quick Actions Bar         | [Sync]    |
+----------+----------------------------------+------------+
|          |                                   |           |
|  LEFT    |  MAIN DASHBOARD CONTENT          |  NEWS     |
|  SIDEBAR |                                   |  SIDEBAR  |
|          |  - Upcoming Events Hero Card      |           |
|  Active  |  - Stats Summary Row              |  Breaking |
|  Modules |  - Handler Activity Grid (3-col)  |  News     |
|          |                                   |  Feed     |
|  ----    |                                   |           |
|          |                                   |           |
|  Coming  |                                   |           |
|  Soon    |                                   |           |
|          |                                   |           |
+----------+----------------------------------+------------+
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/suite/MobileSuiteLanding.tsx` | UPDATE | New mobile layout with bottom tab for modules vs coming soon |
| `src/components/suite/DesktopSuiteLanding.tsx` | UPDATE | Add left sidebar with tabbed navigation |
| `src/components/suite/SuiteLeftSidebar.tsx` | CREATE | Left sidebar with Active Modules + Coming Soon tabs |
| `src/components/suite/SuiteQuickActionsBar.tsx` | CREATE | Horizontal quick actions bar for top |
| `src/components/suite/SuiteDashboardContent.tsx` | CREATE | Main dashboard content area |
| `src/components/suite/SuiteModuleGrid.tsx` | CREATE | Grid of module cards for sidebar |

---

## Implementation Details

### 1. Create SuiteLeftSidebar Component

A collapsible left sidebar with two sections controlled by tabs:
- **Active Modules Tab** - Shows all active module navigation links
- **Coming Soon Tab** - Shows greyed-out coming soon modules

```tsx
// Vertical list of modules with icons
// Active state highlight for current module
// Collapsible on desktop for more space
// Uses Tabs component for switching between Active/Coming Soon
```

Key features:
- Icon + Text for each module
- Gradient icon backgrounds matching each module
- Active indicator for current route
- Stats badge showing counts (e.g., "12 leads")
- Smooth transitions between tabs

### 2. Create SuiteQuickActionsBar Component

Horizontal bar with properly aligned quick action buttons:
- Add Client (blue gradient)
- Add Payment (green gradient)  
- Master Search (violet gradient)
- Master Sync (orange gradient)

Desktop: All 4 buttons in a row
Mobile: 2x2 grid or horizontal scroll

### 3. Update Mobile Layout

New structure:
1. **Header** - Same logo/title
2. **Quick Actions Bar** - New horizontal component at top
3. **Main Content** - Scrollable area with:
   - Upcoming Events Hero
   - Handler Activity Grid (if viewing "Modules" tab)
4. **Bottom Navigation** - Two tabs:
   - "Modules" - Shows active modules grid + handler activity
   - "Coming Soon" - Shows coming soon modules

### 4. Update Desktop Layout

New structure using SidebarProvider:
1. **Left Sidebar** (240px) - Module navigation with tabs
2. **Main Content** (flex-1):
   - Top bar with Quick Actions
   - Dashboard content area
   - Upcoming Events + Handler Activity
3. **Right Sidebar** (384px) - Breaking News (existing)

### 5. Create SuiteDashboardContent Component

Main content area showing:
- Stats summary cards at top
- Upcoming Events Hero
- Handler Activity Grid in 3 columns

---

## Visual Design Improvements

### Professional Theme
- Consistent white cards with subtle shadows
- Gray-50 background
- Proper spacing and padding
- Clear visual hierarchy

### Sidebar Design
- Width: 240px expanded, 72px collapsed (icons only)
- White background with gray-100 hover states
- Active item: violet-100 background + violet border
- Section headers: uppercase, gray-500, small font

### Quick Actions Bar
- Pill-shaped buttons with gradients
- Consistent sizing (h-10)
- Proper gap spacing (gap-3)
- Icons + Text on desktop, icons only on mobile

### Module Cards in Sidebar
- Compact horizontal layout: Icon | Name | Stats
- Icon: 40x40 rounded gradient
- Name: bold, gray-900
- Stats: small text below name
- ChevronRight on hover

---

## Technical Implementation

### Mobile - Bottom Tab Navigation

```tsx
type MobileTab = 'modules' | 'coming-soon';

// Bottom nav switches between:
// - modules: Shows active modules grid + quick actions
// - coming-soon: Shows coming soon modules grid
```

### Desktop - Left Sidebar with Tabs

```tsx
// Using shadcn Tabs inside the sidebar
<Tabs defaultValue="active">
  <TabsList>
    <TabsTrigger value="active">Active</TabsTrigger>
    <TabsTrigger value="coming-soon">Coming Soon</TabsTrigger>
  </TabsList>
  <TabsContent value="active">
    {/* Active modules list */}
  </TabsContent>
  <TabsContent value="coming-soon">
    {/* Coming soon modules list */}
  </TabsContent>
</Tabs>
```

---

## Expected Result

### Mobile
- Clean top quick actions bar
- Focused main content area
- Clear separation between active modules and coming soon via bottom tabs
- Less scrolling, more organized

### Desktop
- Professional sidebar-based navigation
- Quick actions easily accessible at top
- Dashboard content takes center stage
- News sidebar provides real-time updates
- Clear module organization with Active/Coming Soon tabs

---

## Migration Notes

- Preserve all existing functionality (sync, search, payments)
- Keep handler activity grid
- Keep upcoming events hero
- Keep breaking news feed
- Keep all module paths and navigation
- Maintain responsive behavior between mobile/desktop modes

