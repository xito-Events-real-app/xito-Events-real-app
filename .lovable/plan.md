

## Add Benzo Keep Section to Mobile Suite Landing Page

### Overview
Add the existing `SuiteBenzoKeepSection` component to the mobile home tab, positioned just below the Events/Handler tabs section.

---

### Current Mobile Home Tab Layout

```text
┌─────────────────────────────────┐
│  Quick Actions Bar              │
├─────────────────────────────────┤
│  [Search]      [Sync]           │
├─────────────────────────────────┤
│  [Events] [Benzo] [Barun] [Nikit]│
│  ─────────────────────────────  │
│  TodayEventsHero / Handler tabs │
└─────────────────────────────────┘
```

### New Layout (After Change)

```text
┌─────────────────────────────────┐
│  Quick Actions Bar              │
├─────────────────────────────────┤
│  [Search]      [Sync]           │
├─────────────────────────────────┤
│  [Events] [Benzo] [Barun] [Nikit]│
│  ─────────────────────────────  │
│  TodayEventsHero / Handler tabs │
├─────────────────────────────────┤
│  📒 Benzo Keep                  │
│  ┌───────────────────────────┐  │
│  │ 👤 Benzo Keep             │  │
│  │    Write new note         │  │
│  ├───────────────────────────┤  │
│  │ 📋 Unassigned             │  │
│  │    View saved notes       │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

---

### Technical Changes

#### File: `src/components/suite/MobileSuiteLanding.tsx`

1. **Import** the `SuiteBenzoKeepSection` component
2. **Add** the component inside `HomeTabContent()` after the `EventsHandlerTabs` component

**Changes:**

| Location | Change |
|----------|--------|
| Line 1-18 (imports) | Add `import { SuiteBenzoKeepSection } from "./SuiteBenzoKeepSection";` |
| Line 163 (inside HomeTabContent) | Add `<SuiteBenzoKeepSection />` after `<EventsHandlerTabs />` |

---

### Code Changes

**Add import at line 18:**
```typescript
import { SuiteBenzoKeepSection } from "./SuiteBenzoKeepSection";
```

**Update HomeTabContent (around line 145-166):**
```tsx
function HomeTabContent() {
  return (
    <ScrollArea className="flex-1 h-full w-full">
      <div className="px-3 py-4 space-y-3 pb-24 w-full max-w-full overflow-x-hidden box-border">
        {/* Quick Actions */}
        <SuiteQuickActionsBar variant="mobile" />
        
        {/* Search and Sync */}
        <div className="grid grid-cols-2 gap-2 w-full max-w-full">
          <div className="min-w-0 w-full">
            <MasterSearchButton />
          </div>
          <div className="min-w-0 w-full">
            <MasterSyncButton />
          </div>
        </div>
        
        {/* Tabbed Interface for Events + Handler Activity */}
        <EventsHandlerTabs />
        
        {/* Benzo Keep Section - NEW */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <SuiteBenzoKeepSection />
        </div>
      </div>
    </ScrollArea>
  );
}
```

---

### Mobile-Optimized Styling

The `SuiteBenzoKeepSection` component already has responsive styling that works on mobile:
- Full-width buttons with proper padding
- Touch-friendly tap targets (`p-2.5`)
- Clean rounded corners and hover states

Wrapping it in a card container (`bg-white rounded-xl border...`) will make it visually consistent with other mobile sections.

---

### Summary

| File | Change |
|------|--------|
| `src/components/suite/MobileSuiteLanding.tsx` | Add import + add `<SuiteBenzoKeepSection />` wrapped in a card below Events/Handler tabs |

This is a simple one-file change that reuses the existing desktop component.

