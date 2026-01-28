

## Add Dashboard Section to Client Detail Page

Transform the Client Detail page to include a new "Dashboard" section in the sidebar that displays the hero content (client info, quotation, comments).

---

### Current Behavior
- `ClientHeroSection` (name, status, contacts, quotation, comments) is **always visible** at the top
- Sidebar sections (Events, Registration, Contact, etc.) show content below the hero

### New Behavior  
- New **"Dashboard"** section added to sidebar as **first item**
- `ClientHeroSection` content only appears when Dashboard is selected
- Other sections show directly without the hero section above them
- Dashboard is the **default active section** on page load

---

### UI Layout

```text
SIDEBAR                    |  MAIN CONTENT
---------------------------+------------------------------------------
[Back]                     |
Client: John Doe           |
                           |
> Dashboard  ← NEW         |  (When Dashboard selected)
  Events                   |  +--------------------------------------+
  Registration             |  | John Doe [3 days]        | BOOKED   |
  Contact                  |  | 98xxx | 98xxx | email | city        |
  Inquiry                  |  | Added: X | Handler: Y               |
  Sales                    |  | [Call] [WhatsApp] [Status]          |
  Activity                 |  |                                      |
  Comments                 |  | Final Quotation | Recent Comments    |
  Financials               |  +--------------------------------------+
                           |
                           |  (When Events selected)
                           |  +--------------------------------------+
                           |  | Events & Dates                       |
                           |  | [WEDDING] [RECEPTION]                |
                           |  | ...                                  |
                           |  +--------------------------------------+
```

---

### Implementation Details

#### 1. Update `SectionType` in `ClientDetailSidebar.tsx`
Add `'dashboard'` to the type definition and sidebar items array:

```typescript
export type SectionType = 'dashboard' | 'events' | 'registration' | ...;

const sidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },  // NEW - first item
  { id: 'events', label: 'Events', icon: Calendar },
  // ... rest unchanged
];
```

#### 2. Update `ClientDetail.tsx` State
Change default active section from `'events'` to `'dashboard'`:

```typescript
const [activeSection, setActiveSection] = useState<SectionType>('dashboard');
```

#### 3. Move Hero Section into Dashboard Section
Remove the always-visible `ClientHeroSection` and place it inside a conditional:

```typescript
{/* Section Content */}
<div className="p-4 md:p-6 animate-fade-in">
  {/* Dashboard Section - NEW */}
  {activeSection === 'dashboard' && (
    <ClientHeroSection
      client={client}
      currentStatus={currentStatus}
      // ... all existing props
    />
  )}

  {/* Events Section */}
  {activeSection === 'events' && (
    // ... existing events content
  )}
  
  // ... other sections unchanged
```

#### 4. Update Mobile Tabs
Add 'dashboard' to the mobile tab list as the first option.

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/client-detail/ClientDetailSidebar.tsx` | Add `dashboard` to SectionType and sidebarItems array |
| `src/pages/ClientDetail.tsx` | Change default section to `dashboard`, move hero section into conditional |

---

### Technical Notes

1. **Default Section**: Dashboard becomes the landing view when opening a client
2. **Icon**: Use `LayoutDashboard` from lucide-react for the sidebar item
3. **Mobile Tabs**: Dashboard tab appears first in the horizontal scrolling tabs
4. **No Comments Badge on Dashboard**: The comment count badge only shows on the Comments sidebar item (unchanged)

