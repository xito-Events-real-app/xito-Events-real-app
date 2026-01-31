
# Plan: Fix Final Quotation Display & Saving for Booked Clients

## Problem Summary

You have **Sargat Thapa**, a client who is already BOOKED and exists in the **BOOKED CLIENTS** sheet. The issues are:

1. **Wrong UI flow for adding quotation**: When you click "Add Quotation" on the client page, it opens the **initial quotation dialog** (Column V) with "Save & Update Status" - but you need to add the **Final Fixed Quotation** (Column AD) without changing status
2. **Duplicates causing stale data**: The same client may exist in both CLIENT TRACKER and BOOKED CLIENTS sheets, causing the cache to show incorrect/stale data

## Solution Overview

### Part 1: Auto-Clean Duplicates When Accessing Client Data

When `getSingleClient` is called, search **BOOKED CLIENTS first** (priority). This ensures the correct status is always shown for booked clients.

Additionally, modify `getAllClientsFromBothSheets` to deduplicate by `registeredDateTimeAD`, keeping only the **BOOKED CLIENTS** version when duplicates exist.

### Part 2: Add Dedicated "Add Final Quotation" Action for BOOKED Clients

For clients who are already BOOKED but missing Column AD (Final Quotation):
- Show "Add Final Quotation" button (not "Add Quotation")
- When clicked, open the `FinalQuotationDialog` in **save-only mode** (no status change)
- After saving, show "Edit Final Quotation" button to allow updates

### Part 3: Cache Updates by Unique ID Instead of Row Number

Update the cache system to match clients by `registeredDateTimeAD` (not `rowNumber`), preventing stale data when row numbers shift after client moves between sheets.

---

## Technical Implementation

### 1. Backend: Prioritize BOOKED CLIENTS in `getSingleClient`

**File:** `supabase/functions/google-sheets/index.ts`

**Current behavior (lines 1357-1396):** Searches CLIENT TRACKER first, then BOOKED CLIENTS

**New behavior:** Search BOOKED CLIENTS first, then CLIENT TRACKER

```typescript
// BEFORE: Search CLIENT TRACKER first
const trackerResponse = await fetch(trackerUrl, ...);
// ... if found, return tracker result
// ... else search BOOKED CLIENTS

// AFTER: Search BOOKED CLIENTS first (booked wins)
const bookedResponse = await fetch(bookedUrl, ...);
// ... if found, return booked result
// ... else search CLIENT TRACKER
```

This ensures that when a client has been moved to BOOKED CLIENTS, the app always gets the correct data.

### 2. Backend: Deduplicate in `getAllClientsFromBothSheets`

**File:** `supabase/functions/google-sheets/index.ts` (around line 1402)

After merging tracker + booked clients, deduplicate by `registeredDateTimeAD`:

```typescript
// After merging both lists
const merged = [...trackerClients, ...mappedBookedClients];

// Deduplicate: prefer BOOKED over TRACKER when same ID exists
const clientMap = new Map();
for (const client of merged) {
  const id = client.registeredDateTimeAD;
  if (!id) continue;
  
  const existing = clientMap.get(id);
  if (!existing || client._source === 'booked') {
    clientMap.set(id, client);
  }
}

return Array.from(clientMap.values());
```

### 3. Frontend Cache: Update by `registeredDateTimeAD` Instead of `rowNumber`

**File:** `src/lib/cache-manager.ts`

Update `updateClientInCache` to match by unique ID when available:

```typescript
export async function updateClientInCache(
  rowNumber: number, 
  updates: Partial<ClientData>
): Promise<void> {
  const cached = await getCachedData();
  if (!cached?.clients) return;

  const updatedClients = cached.clients.map(client => {
    // Match by registeredDateTimeAD if provided (preferred), else rowNumber
    if (updates.registeredDateTimeAD && client.registeredDateTimeAD === updates.registeredDateTimeAD) {
      return { ...client, ...updates };
    }
    if (client.rowNumber === rowNumber) {
      return { ...client, ...updates };
    }
    return client;
  });

  await setCachedData({
    ...cached,
    clients: updatedClients
  });
}
```

**File:** `src/hooks/useCachedData.ts`

Update `updateClient` function similarly to match by ID first.

### 4. Frontend: Smart "Add Final Quotation" for BOOKED Clients

**File:** `src/components/client-detail/QuotationDisplaySection.tsx`

For BOOKED clients without a final quotation, show "Add Final Quotation" button instead of the generic "Add Quotation":

```typescript
// In the isBooked section (around line 251)
{!parsedFinal && (
  <div className="bg-amber-500/20 rounded-lg border border-amber-500/30 p-3">
    <div className="flex items-center gap-2">
      <AlertTriangle className="h-4 w-4 text-amber-400" />
      <div>
        <div className="font-medium text-amber-200 text-sm">Final Quotation Not Set</div>
        <div className="text-[10px] text-amber-300/70">Lock final quotation for records</div>
      </div>
    </div>
    <Button 
      size="sm" 
      onClick={onAddFinalQuotation}  // New prop
      className="mt-2 bg-amber-500 hover:bg-amber-600 text-black h-7 text-xs"
    >
      <Lock className="h-3 w-3 mr-1" />
      Add Final Quotation
    </Button>
  </div>
)}

// Also show "Edit" button when final quotation exists
{parsedFinal && (
  <Button 
    variant="ghost" 
    size="sm"
    onClick={onAddFinalQuotation}
    className="text-xs text-emerald-400 hover:text-emerald-300"
  >
    <Pencil className="h-3 w-3 mr-1" />
    Edit
  </Button>
)}
```

Add new prop to the component interface:
```typescript
interface QuotationDisplaySectionProps {
  // ... existing props
  onAddFinalQuotation?: () => void;  // New prop for BOOKED clients
}
```

### 5. Frontend: Separate Handler for Final Quotation Save (No Status Change)

**File:** `src/pages/ClientDetail.tsx`

Add new state and handler for "save-only" final quotation (no status change):

```typescript
// New state for direct final quotation save
const [showFinalQuotationDialog, setShowFinalQuotationDialog] = useState(false);

// New handler that saves ONLY the final quotation without changing status
const handleSaveFinalQuotationOnly = async (packageName: string, amount: string) => {
  if (!client?.rowNumber) return;
  
  const finalData = `${packageName}: NPR ${formatNPR(amount)}/-`;
  
  setIsSavingAdvancePending(true);  // Reuse existing saving state
  try {
    // Save final quotation ONLY - no status change
    const quotationResult = await updateFinalQuotation(
      client.rowNumber, 
      finalData, 
      client.registeredDateTimeAD
    );
    
    setCurrentFinalQuotation(quotationResult.finalQuotation);
    
    // Immediately refetch to get fresh data
    const freshClient = await getSingleClient(client.registeredDateTimeAD!);
    if (freshClient && updateClientCache) {
      updateClientCache(freshClient);
    }
    
    toast({ title: "Final quotation saved" });
    setShowFinalQuotationDialog(false);
  } catch (err) {
    console.error('Failed to save final quotation:', err);
    toast({ title: "Failed to save final quotation", variant: "destructive" });
  } finally {
    setIsSavingAdvancePending(false);
  }
};
```

### 6. Frontend: Wire Up the New Dialog

**File:** `src/pages/ClientDetail.tsx`

Pass the new callback to `ClientHeroSection` and `QuotationDisplaySection`:

```typescript
// In ClientHeroSection props
onAddFinalQuotation={() => {
  // For BOOKED clients: open save-only dialog
  if (currentStatus.toUpperCase().includes('BOOKED') && 
      !currentStatus.toUpperCase().includes('SOMEWHERE ELSE')) {
    setShowFinalQuotationDialog(true);
  } else {
    // For non-booked clients: use existing flow (goes to ADVANCE PENDING)
    setPendingStatus('ADVANCE PENDING');
    setShowAdvancePendingDialog(true);
  }
}}
```

Add a new dialog instance for save-only mode:

```typescript
{/* BOOKED - Save Final Quotation Only (no status change) */}
<FinalQuotationDialog
  open={showFinalQuotationDialog}
  onOpenChange={(open) => {
    if (!open) setShowFinalQuotationDialog(false);
  }}
  clientName={client?.clientName || ''}
  existingQuotationData={currentQuotationData || client?.quotationData || ''}
  existingFinalQuotation={currentFinalQuotation || client?.finalQuotation || ''}  // Pre-fill for editing
  onSave={handleSaveFinalQuotationOnly}
  isSaving={isSavingAdvancePending}
  saveButtonText="Save Final Quotation"  // Different button text
/>
```

### 7. Update `FinalQuotationDialog` to Support Editing

**File:** `src/components/status-dialogs/FinalQuotationDialog.tsx`

Add props for editing existing final quotation and customizable button text:

```typescript
interface FinalQuotationDialogProps {
  // ... existing props
  existingFinalQuotation?: string;  // For pre-filling when editing
  saveButtonText?: string;           // Customizable button text
}
```

Pre-fill form when editing:
```typescript
useEffect(() => {
  if (open) {
    // If editing existing final quotation, pre-fill
    if (existingFinalQuotation) {
      const parsed = parseFinalQuotation(existingFinalQuotation);
      if (parsed) {
        setSelectedPackage(parsed.package);
        setFinalAmount(String(parsed.amount).replace(/,/g, ''));
      }
    } else {
      setSelectedPackage('');
      setFinalAmount('');
    }
    setSelectedExistingQuote('');
  }
}, [open, existingFinalQuotation]);
```

### 8. Update `ClientHeroSection` to Pass New Callback

**File:** `src/components/client-detail/ClientHeroSection.tsx`

Add new prop and pass it to `QuotationDisplaySection`:

```typescript
interface ClientHeroSectionProps {
  // ... existing props
  onAddFinalQuotation?: () => void;  // New prop
}

// In the component
<QuotationDisplaySection
  // ... existing props
  onAddFinalQuotation={onAddFinalQuotation}
/>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/google-sheets/index.ts` | 1. `getSingleClient`: search BOOKED CLIENTS first<br>2. `getAllClientsFromBothSheets`: deduplicate by registeredDateTimeAD, prefer booked |
| `src/lib/cache-manager.ts` | `updateClientInCache`: match by registeredDateTimeAD when available |
| `src/hooks/useCachedData.ts` | `updateClient`: match by registeredDateTimeAD first |
| `src/components/client-detail/QuotationDisplaySection.tsx` | 1. Add `onAddFinalQuotation` prop<br>2. Show "Add Final Quotation" for BOOKED without AD<br>3. Show "Edit" button when AD exists |
| `src/components/client-detail/ClientHeroSection.tsx` | Pass `onAddFinalQuotation` prop |
| `src/pages/ClientDetail.tsx` | 1. Add `showFinalQuotationDialog` state<br>2. Add `handleSaveFinalQuotationOnly` handler<br>3. Add second `FinalQuotationDialog` for save-only mode<br>4. Pass correct callback based on status |
| `src/components/status-dialogs/FinalQuotationDialog.tsx` | 1. Add `existingFinalQuotation` prop for editing<br>2. Add `saveButtonText` prop for customizable button<br>3. Pre-fill form when editing |

---

## Expected Result After Fix

1. Open **Sargat Thapa** client page
   - Status shows **BOOKED** (not QUOTATION SENT)
   - Because backend now searches BOOKED CLIENTS first

2. See "Add Final Quotation" button (not "Add Quotation")
   - Because status is BOOKED and Column AD is empty

3. Click "Add Final Quotation"
   - Opens dialog with just "Save Final Quotation" button
   - No status change will occur

4. Select package and enter amount, click save
   - Saves to **BOOKED CLIENTS!AD** (correct sheet)
   - Shows toast: "Final quotation saved"
   - UI updates immediately

5. After saving, see:
   - Final quotation displayed with "Edit" button
   - Can edit if needed later

6. Go to Financials section
   - Payment button is now enabled (Final Quotation exists)
   - Can record payments as usual

---

## Automatic Duplicate Cleanup

As a bonus, when clients are resolved by the improved `getAllClientsFromBothSheets` logic, duplicates are effectively hidden from the UI. For actual deletion, the existing "Cleanup Duplicates" tool in the Booked Clients module header can be used to permanently remove stale entries from CLIENT TRACKER.
