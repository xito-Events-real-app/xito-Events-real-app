
## Quotation Display Below Status: Complete Implementation

This plan adds quotation information directly below the status badge in the Client Detail hero section for all relevant statuses, and prompts the user to enter quotation when missing.

---

### Overview

```text
CURRENT STATE:
- Quotation data only visible in the "Sales" section
- No immediate visibility of pricing in hero section
- No prompt for missing quotation on hero section

NEW BEHAVIOR:
- Show quotation amounts directly below status badge for these statuses:
  * QUOTATION SENT : REVIEW PENDING
  * BARGAINING IS ON (with full bargaining comparison)
  * ADVANCE PENDING
  * BOOKED (final quotation)
  * POSTPONED, CANCELLED, BOOKED SOMEWHERE ELSE

- If quotation required but missing, show "Add Quotation" prompt
- Bargaining status shows full negotiation UI (Our Rate / Client Rate / Counter)
```

---

### Visual Layout

```text
+-----------------------------------------------------------+
|  CLIENT NAME                          [QUOTATION SENT] <- Status Badge
|  ─────────────────────────────────────────────────────
|  ┌─────────────────────────────────────────────────────┐
|  │ QUOTATION AMOUNTS                                    │  <- NEW
|  │ [BASIC: NPR 85,000] [STANDARD: NPR 1,25,000]        │
|  │ [PREMIUM: NPR 1,75,000] [WTN SPECIAL: NPR 2,25,000] │
|  └─────────────────────────────────────────────────────┘
|
|  -- OR if no quotation --
|  ┌─────────────────────────────────────────────────────┐
|  │ ⚠️ Quotation Not Recorded                           │
|  │ [+ Add Quotation Amounts]                           │
|  └─────────────────────────────────────────────────────┘
|
|  📞 9841234567   💬 9841234567   📍 Kathmandu
+-----------------------------------------------------------+
```

---

### Status-Specific Displays

#### 1. QUOTATION SENT : REVIEW PENDING
- Show quotation tiers (BASIC, STANDARD, PREMIUM, WTN SPECIAL) with amounts
- If no quotation, show warning + "Add Quotation" button

#### 2. BARGAINING IS ON
Full negotiation comparison (from FreshClientCard):
```text
┌────────────────────────────────────────────────────────┐
│ NEGOTIATION IN PROGRESS                                 │
├────────────────────────────────────────────────────────┤
│ OUR PROPOSAL:    PREMIUM: NPR 1,75,000/-               │
│ CLIENT ASKING:   PREMIUM: NPR 1,40,000/-  ↓35,000 less │
│ OUR COUNTER:     PREMIUM: NPR 1,55,000/-  Gap: 15,000  │
├────────────────────────────────────────────────────────┤
│ [Edit Client Rate] [Edit Our Counter]                  │
└────────────────────────────────────────────────────────┘
```

#### 3. ADVANCE PENDING
- Show quotation tiers
- If has final quotation, show that

#### 4. BOOKED
- Show FINAL QUOTATION with lock icon
- Show quotation tiers below it

#### 5. CANCELLED / POSTPONED / BOOKED SOMEWHERE ELSE
- Show quotation if recorded (for reference)

---

### Implementation Details

#### 1. Update ClientHeroSection Props
**File:** `src/components/client-detail/ClientHeroSection.tsx`

Add new props:
```typescript
interface ClientHeroSectionProps {
  client: ClientData;
  currentStatus: string;
  quotationData?: string;        // Column V - Initial quotation tiers
  ourBargainedRates?: string;    // Column AA - Our counter rates
  clientBargainedRates?: string; // Column AB - Client's bargained rates
  finalQuotation?: string;       // Column AD - Final fixed quotation
  onAddQuotation: () => void;    // Trigger quotation dialog
  // ... existing props
}
```

#### 2. Create QuotationDisplay Component
**New Component within ClientHeroSection:**

A helper component that:
- Parses quotation data using `parseQuotationData()`
- Renders tier badges with `getQuotationTierColor()`
- Calculates bargaining gaps for "BARGAINING IS ON" status
- Shows appropriate display based on status

#### 3. Status Detection Logic
```typescript
const needsQuotation = (status: string): boolean => {
  const upper = status.toUpperCase();
  return (
    upper.includes('QUOTATION SENT') ||
    upper.includes('BARGAINING') ||
    upper.includes('ADVANCE PENDING') ||
    upper.includes('BOOKED') ||
    upper.includes('CANCELLED') ||
    upper.includes('POSTPONED')
  );
};
```

#### 4. Bargaining Comparison Logic
```typescript
// Parse and compare quotations for bargaining display
const calculateGap = (original: string, proposed: string): number => {
  const origAmount = parseInt(original.replace(/[^0-9]/g, '')) || 0;
  const propAmount = parseInt(proposed.replace(/[^0-9]/g, '')) || 0;
  return origAmount - propAmount;
};
```

---

### File Changes

| File | Action | Purpose |
|------|--------|---------|
| `src/components/client-detail/ClientHeroSection.tsx` | Major Update | Add quotation display below status, handle all status types |
| `src/pages/ClientDetail.tsx` | Minor Update | Pass quotation-related props to ClientHeroSection |

---

### ClientHeroSection Changes

#### New Section Below Status Badge (after line 153):

```tsx
{/* Quotation Display Section */}
<QuotationDisplaySection
  status={currentStatus}
  quotationData={client.quotationData}
  ourBargainedRates={client.ourBargainedRates}
  clientBargainedRates={client.clientBargainedRates}
  finalQuotation={client.finalQuotation}
  onAddQuotation={onAddQuotation}
/>
```

#### QuotationDisplaySection Logic:

For QUOTATION SENT:
```tsx
{isQuotationSent && (
  <div className="mt-4">
    {quotationTiers.length > 0 ? (
      <div className="bg-blue-500/20 rounded-xl border border-blue-500/30 p-4">
        <div className="text-xs text-blue-300 mb-2 font-semibold uppercase tracking-wide">
          Quotation Sent
        </div>
        <div className="flex flex-wrap gap-2">
          {quotationTiers.map((tier) => (
            <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${getTierColorDark(tier.tier)}`}>
              <span className="opacity-70">{tier.tier}:</span> {tier.amount}
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className="bg-amber-500/20 rounded-xl border border-amber-500/30 p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <div>
            <div className="font-medium text-amber-200">Quotation Not Recorded</div>
            <div className="text-xs text-amber-300/70">Add quotation to proceed</div>
          </div>
        </div>
        <Button 
          size="sm" 
          onClick={onAddQuotation}
          className="mt-3 bg-amber-500 hover:bg-amber-600 text-black"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Quotation
        </Button>
      </div>
    )}
  </div>
)}
```

For BARGAINING IS ON:
```tsx
{isBargaining && (
  <div className="mt-4 bg-amber-500/20 rounded-xl border border-amber-500/30 p-4 space-y-3">
    <div className="text-xs text-amber-300 font-semibold uppercase tracking-wide">
      Negotiation In Progress
    </div>
    
    {/* Our Original Proposal */}
    <div className="flex items-center justify-between">
      <span className="text-white/60 text-sm">Our Proposal</span>
      <div className="flex flex-wrap gap-1.5">
        {parseQuotationData(quotationData).map(tier => (
          <span className={`px-2 py-0.5 rounded text-xs ${getTierColorDark(tier.tier)}`}>
            {tier.tier}: {tier.amount}
          </span>
        ))}
      </div>
    </div>
    
    {/* Client's Ask */}
    <div className="flex items-center justify-between">
      <span className="text-white/60 text-sm">Client Asking</span>
      {clientBargainedRates ? (
        <div className="flex flex-wrap gap-1.5">
          {parseQuotationData(clientBargainedRates).map(tier => (
            <span className="px-2 py-0.5 rounded text-xs bg-red-500/30 text-red-200">
              {tier.tier}: {tier.amount}
              <span className="ml-1 text-red-400">↓{calculateDiff(tier)}/-</span>
            </span>
          ))}
        </div>
      ) : (
        <span className="text-white/40 text-sm">Not set</span>
      )}
    </div>
    
    {/* Our Counter */}
    <div className="flex items-center justify-between">
      <span className="text-white/60 text-sm">Our Counter</span>
      {ourBargainedRates ? (
        <div className="flex flex-wrap gap-1.5">
          {parseQuotationData(ourBargainedRates).map(tier => (
            <span className="px-2 py-0.5 rounded text-xs bg-green-500/30 text-green-200">
              {tier.tier}: {tier.amount}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-white/40 text-sm">Not set</span>
      )}
    </div>
    
    {/* Show Add Quotation if original not set */}
    {!quotationData && (
      <Button size="sm" onClick={onAddQuotation} className="mt-2 bg-amber-500 hover:bg-amber-600 text-black">
        <Plus className="h-4 w-4 mr-1" />
        Add Original Quotation
      </Button>
    )}
  </div>
)}
```

For BOOKED:
```tsx
{isBooked && (
  <div className="mt-4">
    {/* Final Quotation - Priority Display */}
    {parsedFinalQuotation && (
      <div className="bg-emerald-500/20 rounded-xl border border-emerald-500/30 p-4 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-4 w-4 text-emerald-400" />
          <span className="text-xs text-emerald-300 font-semibold uppercase tracking-wide">
            Final Fixed Quotation
          </span>
        </div>
        <Badge className={`${getTierColorDark(parsedFinalQuotation.package)} text-sm`}>
          {parsedFinalQuotation.package}
        </Badge>
        <div className="text-2xl font-bold text-white mt-2">
          NPR {formatNPR(parsedFinalQuotation.amount)}/-
        </div>
      </div>
    )}
    
    {/* Original Quotation Tiers */}
    {quotationTiers.length > 0 && (
      <div className="bg-white/5 rounded-xl border border-white/10 p-3">
        <div className="text-xs text-white/40 mb-2">Original Quotation</div>
        <div className="flex flex-wrap gap-2">
          {quotationTiers.map(tier => (...))}
        </div>
      </div>
    )}
  </div>
)}
```

---

### Dark Theme Color Helpers

```typescript
// Dark theme tier colors (for hero section)
function getTierColorDark(tier: string): string {
  switch (tier.toUpperCase()) {
    case 'BASIC':
      return 'bg-blue-500/30 text-blue-200';
    case 'STANDARD':
      return 'bg-green-500/30 text-green-200';
    case 'PREMIUM':
      return 'bg-purple-500/30 text-purple-200';
    case 'WTN SPECIAL':
      return 'bg-amber-500/30 text-amber-200';
    default:
      return 'bg-white/20 text-white';
  }
}
```

---

### ClientDetail.tsx Updates

Pass `onAddQuotation` callback to trigger the existing quotation dialog:

```tsx
<ClientHeroSection
  client={client}
  currentStatus={currentStatus}
  onCall={handleCall}
  onPayment={() => setShowPaymentDrawer(true)}
  onStatusClick={() => setShowStatusDropdown(true)}
  onEdit={handleEdit}
  onAddComment={handleAddCommentDirect}
  onAddQuotation={() => {
    setPendingStatus('QUOTATION SENT : REVIEW PENDING');
    setShowQuotationDialog(true);
  }}
  isLoggingCall={isLoggingCall}
  isChangingStatus={isChangingStatus}
  isAddingComment={isAddingComment}
/>
```

---

### Edge Cases Handled

1. **No quotation for QUOTATION SENT** - Shows amber warning + button
2. **No quotation for BARGAINING** - Shows warning in bargaining section
3. **BOOKED without final quotation** - Still shows original quotation tiers
4. **CANCELLED/POSTPONED** - Shows quotation for reference (if exists)
5. **Early statuses (JUST ENQUIRED, NUMBER PROVIDED)** - No quotation section shown

---

### Status Hierarchy

| Status | Display |
|--------|---------|
| JUST ENQUIRED | No quotation section |
| NUMBER PROVIDED | No quotation section |
| TEXTED | No quotation section |
| CALL NOT RECEIVED | No quotation section |
| CALLED : QUOTATION PENDING | No quotation section (hasn't been sent) |
| QUOTATION SENT | Show tiers OR prompt to add |
| BARGAINING IS ON | Show full negotiation comparison |
| ADVANCE PENDING | Show tiers + final if set |
| BOOKED | Show final + original tiers |
| CANCELLED / POSTPONED | Show tiers for reference |
| BOOKED SOMEWHERE ELSE | Show tiers for reference |

---

### Summary

This implementation:
1. Adds quotation visibility directly in the hero section below the status badge
2. Provides status-appropriate displays (simple tiers vs full bargaining comparison)
3. Prompts users to add quotation when missing for relevant statuses
4. Reuses existing quotation dialog from ClientDetail.tsx
5. Uses dark theme colors consistent with the Netflix-style hero section
6. Follows existing patterns from FreshClientCard for bargaining logic
