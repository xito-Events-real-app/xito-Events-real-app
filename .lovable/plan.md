
## Improve Client Detail Page: Description, Comments, Status Sync, and Quotation Dialog

This plan addresses all your requests to enhance the Client Detail page with better visibility for description and comments, the ability to add new comments, global status synchronization, and the quotation dialog when changing status to "QUOTATION SENT : REVIEW PENDING".

---

### Overview of Changes

```text
+----------------------------------------+
|         CLIENT DETAIL PAGE             |
+----------------------------------------+
|  1. DESCRIPTION CARD (New prominent    |
|     section at top of view mode)       |
+----------------------------------------+
|  2. COMMENTS SECTION                   |
|     - View all comments                |
|     - Add new comment input            |
|     - Real-time updates                |
+----------------------------------------+
|  3. STATUS CHANGE                      |
|     - Quotation dialog for             |
|       "QUOTATION SENT" transition      |
|     - Global cache sync after change   |
+----------------------------------------+
|  4. QUOTATION DISPLAY                  |
|     - Show quotation tiers in Sales    |
|       tab after entry                  |
+----------------------------------------+
```

---

### Implementation Steps

#### 1. Add Prominent Description Section
**File:** `src/pages/ClientDetail.tsx`

Add a visible description card right below the header in view mode (before the tabs):

- Display the description in a highlighted card with a gradient background
- Use `FileText` icon to indicate it's the description
- Show "No description" message if empty
- Make it collapsible if the description is very long

**Position:** After the action buttons row, before the tabs

---

#### 2. Enhance Comments Section with Add Comment Feature
**File:** `src/pages/ClientDetail.tsx`

Current state: Comments tab only shows existing comments without option to add

**Changes needed:**

A. **Add state variables:**
```typescript
const [newComment, setNewComment] = useState("");
const [isAddingComment, setIsAddingComment] = useState(false);
const [currentComments, setCurrentComments] = useState(client.comments || "");
```

B. **Add comment handler function:**
```typescript
const handleAddComment = async () => {
  if (!client?.rowNumber || !newComment.trim()) return;
  
  setIsAddingComment(true);
  try {
    const result = await addClientComment(
      client.rowNumber, 
      newComment.trim(), 
      currentComments
    );
    setCurrentComments(result.comments);
    setNewComment('');
    toast({ title: "Comment added" });
    
    // Update global cache
    if (updateClientCache) {
      updateClientCache({ ...client, comments: result.comments });
    }
  } catch (err) {
    toast({ title: "Failed to add comment", variant: "destructive" });
  } finally {
    setIsAddingComment(false);
  }
};
```

C. **Update Comments tab UI to include:**
- Text area for new comment input
- "Add Comment" button with loading state
- Parse comments from `currentComments` instead of `client.comments`

---

#### 3. Global Status Synchronization
**File:** `src/pages/ClientDetail.tsx`

The current `handleStatusChange` function updates status but doesn't fully sync the cache.

**Update the function to:**
```typescript
const handleStatusChange = async (newStatus: string) => {
  if (!client?.rowNumber) return;
  
  setIsChangingStatus(true);
  try {
    const result = await updateClientStatus(client.rowNumber, newStatus, currentStatusLog);
    setCurrentStatusLog(result.statusLog);
    
    // CRITICAL: Update global cache to sync across the app
    if (updateClientCache) {
      updateClientCache({ 
        ...client, 
        statusLog: result.statusLog 
      });
    }
    
    toast({ title: "Success", description: `Status changed to ${newStatus}` });
  } catch (err) {
    toast({ title: "Error", variant: "destructive" });
  } finally {
    setIsChangingStatus(false);
  }
};
```

This ensures that when you change status on the Client Detail page, it:
1. Updates the backend (Google Sheet)
2. Updates local state (currentStatusLog)
3. Updates the global IndexedDB cache
4. Notifies all other components via the cache update event

---

#### 4. Add Quotation Dialog for "QUOTATION SENT" Status Transition
**File:** `src/pages/ClientDetail.tsx`

**New state variables:**
```typescript
const [showQuotationDialog, setShowQuotationDialog] = useState(false);
const [quotationAmounts, setQuotationAmounts] = useState<Record<string, string>>({});
const [isSavingQuotation, setIsSavingQuotation] = useState(false);
const [currentQuotationData, setCurrentQuotationData] = useState(client.quotationData || "");
```

**New imports:**
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { updateClientQuotation } from "@/lib/sheets-api";
```

**Modify `handleStatusChange` to intercept:**
```typescript
const handleStatusChange = async (newStatus: string) => {
  if (!client?.rowNumber) return;
  
  const currentStatus = getCurrentStatus(currentStatusLog);
  
  // INTERCEPT: If moving to QUOTATION SENT, show quotation dialog first
  const isFromQuotationPending = currentStatus?.toUpperCase().includes('QUOTATION PENDING');
  const isToQuotationSent = newStatus.toUpperCase().includes('QUOTATION SENT');
  
  if (isFromQuotationPending && isToQuotationSent) {
    setPendingStatus(newStatus);
    setShowQuotationDialog(true);
    return;
  }
  
  // Continue with normal status change...
  await performStatusChange(newStatus);
};
```

**Add quotation save handler:**
```typescript
const handleSaveQuotation = async () => {
  if (!client?.rowNumber) return;
  
  const tiers = ['BASIC', 'STANDARD', 'PREMIUM', 'WTN SPECIAL'];
  const filledQuotations = tiers
    .filter(tier => quotationAmounts[tier]?.trim())
    .map(tier => `${tier}: NPR ${formatNPR(quotationAmounts[tier])}/-`);
  
  if (filledQuotations.length === 0) {
    toast({ title: "Please enter at least one quotation amount", variant: "destructive" });
    return;
  }
  
  const quotationData = filledQuotations.join('\n');
  
  setIsSavingQuotation(true);
  try {
    await updateClientQuotation(client.rowNumber, quotationData);
    setCurrentQuotationData(quotationData);
    
    // Update status to QUOTATION SENT
    const statusResult = await updateClientStatus(client.rowNumber, 'QUOTATION SENT : REVIEW PENDING', currentStatusLog);
    setCurrentStatusLog(statusResult.statusLog);
    
    // Update global cache with both quotation and status
    if (updateClientCache) {
      updateClientCache({
        ...client,
        quotationData: quotationData,
        statusLog: statusResult.statusLog
      });
    }
    
    toast({ title: "Quotation saved & status updated" });
    setShowQuotationDialog(false);
    setQuotationAmounts({});
  } catch (err) {
    toast({ title: "Failed to save quotation", variant: "destructive" });
  } finally {
    setIsSavingQuotation(false);
  }
};
```

**Add the Dialog component at the end of the JSX:**
```xml
<Dialog open={showQuotationDialog} onOpenChange={(open) => {
  if (!open) {
    setShowQuotationDialog(false);
    setQuotationAmounts({});
  }
}}>
  <DialogContent className="max-w-sm">
    <DialogHeader>
      <DialogTitle>Enter Quotation Amounts</DialogTitle>
      <DialogDescription>
        Enter the prices quoted to {client.clientName}. At least one is required.
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-2">
      {['BASIC', 'STANDARD', 'PREMIUM', 'WTN SPECIAL'].map((tier) => (
        <div key={tier} className="space-y-1.5">
          <Label>{tier}</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">NPR</span>
            <Input
              type="number"
              placeholder="e.g., 50000"
              value={quotationAmounts[tier] || ''}
              onChange={(e) => setQuotationAmounts({ ...quotationAmounts, [tier]: e.target.value })}
            />
          </div>
        </div>
      ))}
    </div>
    
    <DialogFooter>
      <Button variant="outline" onClick={() => setShowQuotationDialog(false)}>Cancel</Button>
      <Button onClick={handleSaveQuotation} disabled={isSavingQuotation}>
        {isSavingQuotation ? "Saving..." : "Save & Update Status"}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

#### 5. Display Quotation Data on Client Page
**File:** `src/pages/ClientDetail.tsx`

The Sales tab already displays quotation tiers via `quotationTiers`. 

**Update to use `currentQuotationData` instead of `client.quotationData`:**
```typescript
const quotationTiers = useMemo(() => 
  parseQuotationData(currentQuotationData || client.quotationData || ''), 
  [currentQuotationData, client.quotationData]
);
```

This ensures that when you save a new quotation, the Sales tab immediately reflects the updated values.

---

### Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/pages/ClientDetail.tsx` | Modify | Add description section, comment input, quotation dialog, and global sync |

---

### Technical Details

#### Data Flow for Status Change with Quotation

```text
User clicks Status → QUOTATION SENT
          ↓
handleStatusChange intercepts
          ↓
Check: Is current status "QUOTATION PENDING"?
          ↓ YES
Show Quotation Dialog
          ↓
User enters prices for tiers (BASIC, STANDARD, etc.)
          ↓
User clicks "Save & Update Status"
          ↓
1. updateClientQuotation() → Save to Column V
2. updateClientStatus() → Update status to QUOTATION SENT
3. updateClientCache() → Sync to global IndexedDB
4. notifyCacheUpdate() → Event dispatched to all components
          ↓
All pages (Dashboard, Fresh Clients, etc.) show updated status
```

#### Comment System Data Flow

```text
User enters comment in textarea
          ↓
Clicks "Add Comment"
          ↓
addClientComment() API call
          ↓
Comment appended to Column AC with timestamp
          ↓
Result returned with updated comments string
          ↓
1. setCurrentComments() → Local state update
2. updateClientCache() → Sync to global IndexedDB
          ↓
Comments visible across all pages
```

---

### UI Layout Preview

**View Mode - Top of Page:**
```text
+------------------------------------------+
| [Back] [Name Badge]           [Edit Btn] |
+------------------------------------------+
| [Call] [WhatsApp] [Payment] [Status ▼]   |
+------------------------------------------+
|                                          |
| ┌──────────────────────────────────────┐ |
| │ 📝 DESCRIPTION                       │ |
| │ "Interested in premium package for   │ |
| │ wedding in Pokhara. Budget flexible."│ |
| └──────────────────────────────────────┘ |
|                                          |
| [Events] [Inquiry] [Sales] [Activity]... |
+------------------------------------------+
```

**Comments Tab:**
```text
+------------------------------------------+
| 💬 COMMENTS                              |
+------------------------------------------+
| ┌──────────────────────────────────────┐ |
| │ [Text area: Add your comment...]     │ |
| │                          [Add ✓]     │ |
| └──────────────────────────────────────┘ |
|                                          |
| ┌──────────────────────────────────────┐ |
| │ "Called and discussed pricing"       │ |
| │ Magh 15, 2082 at 3:45 PM            │ |
| └──────────────────────────────────────┘ |
|                                          |
| ┌──────────────────────────────────────┐ |
| │ "Initial inquiry received via WA"    │ |
| │ Magh 12, 2082 at 10:20 AM           │ |
| └──────────────────────────────────────┘ |
+------------------------------------------+
```

---

### Edge Cases Handled

1. **Empty description**: Shows "No description added" placeholder
2. **Empty comments**: Shows "No comments yet" with input still available
3. **Quotation dialog cancel**: No changes made, dialog closes cleanly
4. **Partial quotation**: At least one tier required (validation)
5. **Network failure**: Toast error shown, state not corrupted
6. **Cache sync**: Uses `notifyCacheUpdate` to inform all components of changes

