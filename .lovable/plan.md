

## Client Detail Page UI Modifications

This plan reorganizes the Client Hero Section for a more compact and efficient layout with quick-access contact actions.

---

### Changes Overview

| Change | Description |
|--------|-------------|
| 1. Client Name | Reduce size, add "X days remaining" badge for first event |
| 2. Contact Numbers | Make clickable to open apps directly, add call logging |
| 3. Remove Icons | Remove Phone/WhatsApp icons below numbers |
| 4. Top Row Consolidation | Move Status, Added By, Handler to same line as action buttons |
| 5. Remove Payment Button | Remove from action buttons row |
| 6. Quotation + Comments | Reduce quotation size, add comments section alongside |

---

### Detailed Implementation

#### 1. Client Name with Days Remaining

**Current:**
```
Client Name (text-3xl/4xl)
```

**New:**
```
Client Name (text-xl/2xl)  [3 days remaining] badge
```

- Calculate days remaining from first event's BS date converted to AD
- Show badge only if event is in the future
- Use amber/orange color for urgency

#### 2. Contact Numbers - Direct Click Actions

Transform static contact display into clickable links that:
- **Contact Number**: Opens phone dialer (`tel:` link) AND logs call
- **WhatsApp Number**: Opens WhatsApp (`https://wa.me/`) AND logs call

**New onClick behavior:**
```typescript
const handleContactClick = async () => {
  // 1. Open phone app immediately
  window.open(`tel:${client.contactNo}`, '_self');
  // 2. Log the call attempt in background
  await logCallAttempt(client.rowNumber, 'DIRECT', ...);
};
```

#### 3. Remove Contact Icons

Remove the `<Phone>` and `<MessageCircle>` icons from lines 94-97 and 100-103 in `ClientHeroSection.tsx`.

#### 4. Consolidated Top Row Layout

**Current Layout:**
```
Row 1: Client Name | Status Badge + Edit
Row 2: Contact Info with icons
Row 3: Added By | Handler
Row 4: Action Buttons (Call, WhatsApp, Payment, Status)
```

**New Layout:**
```
Row 1: Client Name [X days] | Status Badge
Row 2: Contact (clickable) | WhatsApp (clickable) | Email | City | Added By | Handler
Row 3: [Call] [WhatsApp] [Status] buttons only (no Payment)
```

#### 5. Remove Payment Button

Remove the Payment button from the quick actions row - users can access payments from the Financials section.

#### 6. Quotation + Comments Side by Side

**Current:** Full-width quotation section, then separate comments section below

**New Layout (for BOOKED status):**
```
+------------------------+------------------------+
| Final Quotation        | Recent Comments        |
| (Compact)              | (Latest first)         |
+------------------------+------------------------+
```

- Reduce quotation padding and text sizes
- Add comments panel on the right (flex layout)
- Comments already show latest first (existing logic uses `.reverse()`)

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/client-detail/ClientHeroSection.tsx` | Main layout restructure, days remaining, clickable contacts |
| `src/components/client-detail/QuotationDisplaySection.tsx` | Add comments prop, reduce sizes, side-by-side layout |
| `src/lib/client-card-utils.ts` | Add `getDaysUntilEvent` utility function |

---

### New Utility Function

```typescript
// Calculate days until an event from BS date
export function getDaysUntilEvent(
  eventYear: string, 
  eventMonth: string, 
  eventDay: string
): number | null {
  if (!eventYear || !eventMonth || !eventDay) return null;
  if (eventDay === '**') return null; // Unknown day
  
  const year = parseInt(eventYear);
  const month = parseInt(eventMonth);
  const day = parseInt(eventDay);
  
  const eventDateAD = bsToAD(year, month, day);
  if (typeof eventDateAD === 'string') return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDateAD.setHours(0, 0, 0, 0);
  
  const diffTime = eventDateAD.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : null;
}
```

---

### Updated ClientHeroSection Props

```typescript
interface ClientHeroSectionProps {
  client: ClientData;
  currentStatus: string;
  firstEventDaysRemaining?: number | null;  // NEW
  onCall: (type: 'DIRECT' | 'WHATSAPP') => void;
  // onPayment: () => void;  // REMOVED
  onStatusClick: () => void;
  onEdit: () => void;
  onAddComment: (comment: string) => Promise<void>;
  onAddQuotation: () => void;
  isLoggingCall?: boolean;
  isChangingStatus?: boolean;
  isAddingComment?: boolean;
}
```

---

### Visual Result

**Before:**
```
+------------------------------------------+
| LARGE CLIENT NAME           | BOOKED     |
| 📞 98xxxxxxxx  💬 98xxxxxxx | [Edit]     |
| 📧 email  📍 city                        |
| [Avatar] Added By  |  [Avatar] Handler   |
+------------------------------------------+
| [Call] [WhatsApp] [Payment] [Status]     |
+------------------------------------------+
| Final Fixed Quotation (large)            |
+------------------------------------------+
| Comments (separate section)              |
+------------------------------------------+
```

**After:**
```
+------------------------------------------+
| Client Name [3 days]        | BOOKED     |
| 98xxx (tap) | 98xxx (tap) | email | city |
| Added: John  |  Handler: Jane            |
+------------------------------------------+
| [Call] [WhatsApp] [Status]               |
+------------------------------------------+
| Final Quotation    |  Recent Comments    |
| (compact)          |  (scrollable)       |
+------------------------------------------+
```

