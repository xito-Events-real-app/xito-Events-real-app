
## Netflix-Style Client Detail Page Redesign

This plan transforms the Client Detail page into a cinematic, Netflix-inspired experience with a dark theme, left sidebar navigation, prominent hero description section, and quick activity summaries.

---

### Current vs New Architecture

```text
CURRENT LAYOUT:
+------------------------------------------+
| [Back] [Nav] [Name]           [Edit]     |
+------------------------------------------+
| [Call] [WhatsApp] [Payment] [Status]     |
+------------------------------------------+
| [Description Card - if exists]           |
+------------------------------------------+
| [Client Info] [Events] [Category]        |  <- 3 Cards
+------------------------------------------+
| Events | Inquiry | Sales | Activity | ... | <- Horizontal Tabs
+------------------------------------------+
| [Tab Content Area]                       |
+------------------------------------------+


NEW NETFLIX-STYLE LAYOUT:
+--------+---------------------------------------------+
| SIDE   |  HERO SECTION                               |
| BAR    +---------------------------------------------+
|        |  CLIENT NAME (Large)     [Status Badge]    |
| Events |  Contact: +977...        [Quick Actions]   |
| Regis- |  Handler: Name | Added: Name               |
| tration|---------------------------------------------+
| Contact|  📝 DESCRIPTION (Netflix-style box)        |
| Inquiry|  "Interested in premium package for        |
| Sales  |   wedding in Pokhara. Budget flexible."    |
| Activ- +---------------------------------------------+
| ity    |  LAST ACTIVITIES                           |
| Comment|  • Status → QUOTATION SENT (2h ago)        |
| Financ |  • Called via WhatsApp (1d ago)            |
|        |  • Comment: "Discussed pricing" (2d ago)   |
+--------+---------------------------------------------+
         |  [SELECTED SECTION CONTENT]                |
         |  (Events / Sales / Financials, etc.)       |
         +---------------------------------------------+
```

---

### Implementation Steps

#### 1. Create Netflix-Style Sidebar Component
**New File:** `src/components/client-detail/ClientDetailSidebar.tsx`

A collapsible dark sidebar with vertical navigation for all sections:

- **Sections:** Events, Registration, Contact, Inquiry, Sales, Activity, Comments, Financials
- **Styling:** Uses existing dark theme pattern from `DesktopSidebar.tsx`:
  ```
  bg-[hsl(220,25%,10%)] text-[hsl(220,15%,95%)] border-[hsl(220,20%,18%)]
  ```
- **Active State:** Highlighted item with gradient background
- **Quick Actions:** Call, WhatsApp, Payment buttons at bottom
- **Collapse Toggle:** Same pattern as other sidebars

#### 2. Create Hero Section Component
**New File:** `src/components/client-detail/ClientHeroSection.tsx`

Netflix-style hero with prominent client info:

- **Client Name:** Large, bold typography (text-3xl/4xl) with month-based color gradient
- **Contact Row:** Phone and WhatsApp icons inline with numbers (clickable)
- **Handler/Added By:** Avatar circles with names
- **Status Badge:** Large, prominent status indicator
- **Quick Actions:** Floating action buttons (Call, WhatsApp, Payment, Edit)
- **Background:** Subtle gradient with blur effects (`bg-black/90 backdrop-blur-lg`)

#### 3. Create Description Card (Netflix-Style)
**Part of Hero Section**

- **Position:** Below client name, spanning full width
- **Styling:** Semi-transparent dark card with subtle border
- **Icon:** FileText icon with amber accent
- **Typography:** Clear, readable text on dark background
- **Empty State:** "No description added" with muted styling

#### 4. Create Last Activities Summary Component
**New File:** `src/components/client-detail/LastActivitiesSummary.tsx`

Compact activity timeline showing:

- **Latest Status Change:** With relative time (e.g., "2h ago")
- **Latest Call Attempt:** Type (Direct/WhatsApp) + time
- **Latest Comment:** First 50 chars truncated + time
- **Latest Payment:** Amount + time (if any)

Each activity item uses:
- Colored dot indicator (green for positive, amber for neutral, red for critical)
- Icon representing activity type
- Relative timestamp

#### 5. Refactor Main Content Area
**File:** `src/pages/ClientDetail.tsx`

Transform from horizontal tabs to sidebar-controlled sections:

- **State Management:** Replace `Tabs` with `activeSection` state
- **Content Rendering:** Conditional rendering based on `activeSection`
- **Layout:** Use `flex` with fixed sidebar + fluid main content
- **Mobile Adaptation:** Stack layout on mobile, sidebar becomes bottom sheet or hidden

#### 6. Section Content Components
Reuse existing tab content but enhance styling:

- **Events Section:** Keep nested sub-tabs for event types
- **Registration Section:** Client basic info + source details
- **Contact Section:** Phone, WhatsApp, Email, Location
- **Inquiry Section:** Dates, times, description
- **Sales Section:** Quotations, mindset, bargaining
- **Activity Section:** Status history, call log
- **Comments Section:** Add comment + history
- **Financials Section:** Payments, progress bar, history

---

### File Structure

```text
src/components/client-detail/
├── ClientDetailSidebar.tsx    (NEW - Left navigation)
├── ClientHeroSection.tsx      (NEW - Netflix-style hero)
├── LastActivitiesSummary.tsx  (NEW - Activity preview)
├── sections/
│   ├── EventsSection.tsx      (Extracted from ClientDetail)
│   ├── RegistrationSection.tsx
│   ├── ContactSection.tsx
│   ├── InquirySection.tsx
│   ├── SalesSection.tsx
│   ├── ActivitySection.tsx
│   ├── CommentsSection.tsx
│   └── FinancialsSection.tsx
└── index.ts
```

---

### Technical Details

#### Color Palette (Netflix-Inspired Dark Theme)

| Element | Color |
|---------|-------|
| Sidebar Background | `hsl(220, 25%, 10%)` - Deep navy |
| Main Background | `bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950` |
| Hero Overlay | `bg-black/80 backdrop-blur-xl` |
| Active Nav Item | `bg-gradient-to-r from-primary to-primary/80` |
| Text Primary | `text-white` |
| Text Secondary | `text-white/70` |
| Accent | `text-primary` (existing brand color) |

#### Sidebar Navigation Items

| Icon | Label | Maps To |
|------|-------|---------|
| Calendar | Events | Existing Events tab content |
| FileText | Registration | Client basic info + source |
| Phone | Contact | Phone, WhatsApp, Email |
| Clock | Inquiry | Inquiry dates and description |
| DollarSign | Sales | Quotations and bargaining |
| Activity | Activity | Status history and calls |
| MessageSquare | Comments | Comments with add feature |
| CreditCard | Financials | Payments and progress |

#### Mobile Responsiveness

- **Desktop (>1024px):** Fixed left sidebar (w-64) + main content
- **Tablet (768-1024px):** Collapsed sidebar (w-16 icons only) + main content
- **Mobile (<768px):** 
  - No sidebar, use bottom sheet navigation
  - Hero section simplified
  - Horizontal scroll for quick actions

---

### UI Preview

#### Hero Section Design
```text
+-----------------------------------------------------------+
|                                                           |
|   ██████████████████████████████████████████████████████  |
|   █                                                    █  |
|   █  RAMESH SHARMA                    [QUOTATION SENT] █  |
|   █  ─────────────────────────────────────────────────█  |
|   █  📞 +977-9841234567    💬 +977-9841234567         █  |
|   █                                                    █  |
|   █  ┌─────────────────────────────────────────────┐  █  |
|   █  │ 📝 DESCRIPTION                               │  █  |
|   █  │ Interested in premium wedding package for    │  █  |
|   █  │ destination wedding in Pokhara. Budget is    │  █  |
|   █  │ flexible. Looking for full coverage.         │  █  |
|   █  └─────────────────────────────────────────────┘  █  |
|   █                                                    █  |
|   █  LAST ACTIVITIES                                   █  |
|   █  ● Status changed to QUOTATION SENT (2h ago)      █  |
|   █  ○ WhatsApp call logged (1d ago)                  █  |
|   █  ○ Comment: "Discussed pricing..." (2d ago)       █  |
|   █                                                    █  |
|   ██████████████████████████████████████████████████████  |
|                                                           |
+-----------------------------------------------------------+
```

#### Sidebar Design
```text
+------------------+
|  ← Back to Suite |
+------------------+
|  [Client Icon]   |
|  Client Detail   |
+------------------+
|                  |
|  📅 Events     ← |  (Active)
|  📋 Registration |
|  📞 Contact      |
|  🕐 Inquiry      |
|  💰 Sales        |
|  📊 Activity     |
|  💬 Comments (3) |
|  💳 Financials   |
|                  |
+------------------+
|  [Call] [WA]     |
|  [Payment]       |
+------------------+
```

---

### Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/client-detail/ClientDetailSidebar.tsx` | Create | Netflix-style left sidebar navigation |
| `src/components/client-detail/ClientHeroSection.tsx` | Create | Hero with name, contact, description |
| `src/components/client-detail/LastActivitiesSummary.tsx` | Create | Compact recent activities preview |
| `src/components/client-detail/index.ts` | Create | Export barrel file |
| `src/pages/ClientDetail.tsx` | Major Refactor | New layout with sidebar + hero + sections |

---

### State Management

```typescript
// New state for section navigation
const [activeSection, setActiveSection] = useState<
  'events' | 'registration' | 'contact' | 'inquiry' | 
  'sales' | 'activity' | 'comments' | 'financials'
>('events');

// Sidebar collapsed state
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
```

---

### Data Flow

```text
ClientDetail Page
      │
      ├── ClientDetailSidebar (Navigation)
      │       └── onClick → setActiveSection()
      │
      ├── ClientHeroSection (Hero Display)
      │       ├── Client Name + Status
      │       ├── Contact Info
      │       ├── Description Card
      │       └── LastActivitiesSummary
      │
      └── Main Content Area
              └── Conditional render based on activeSection
                  ├── 'events' → EventsSection
                  ├── 'registration' → RegistrationSection
                  ├── 'contact' → ContactSection
                  ├── 'inquiry' → InquirySection
                  ├── 'sales' → SalesSection
                  ├── 'activity' → ActivitySection
                  ├── 'comments' → CommentsSection
                  └── 'financials' → FinancialsSection
```

---

### Key Features Preserved

- All existing functionality (edit mode, call logging, payment drawer, quotation dialog)
- Global status synchronization
- Comment adding with cache updates
- Navigation (prev/next client)
- Keyboard shortcuts
- Mobile responsiveness

---

### Animation Enhancements

- **Section Transitions:** `animate-fade-in` when switching sections
- **Sidebar Hover:** `hover:bg-white/10` with smooth transition
- **Hero Entrance:** Subtle scale + fade animation on page load
- **Activity Items:** Staggered fade-in for timeline items
