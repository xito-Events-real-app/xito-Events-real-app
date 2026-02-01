

## Add Bargaining Dialog Interception to Client Detail Page

### Problem
When changing status to "BARGAINING IS ON" on the Client Detail page, the status changes directly without asking for bargaining details (Client's Rate, Our Counter Rate). This works correctly in the Client Tracker filter view (FreshClientCard) but is missing on the Client Detail page.

### Solution
Add a Bargaining Dialog interception in `ClientDetail.tsx` similar to how QUOTATION SENT, ADVANCE PENDING, and BOOKED transitions are handled. When user selects "BARGAINING IS ON" status, a dialog will appear asking for:
1. Which packages are being bargained
2. Client's bargained rate for each package
3. Our counter rate for each package

---

### Technical Changes

#### File: `src/pages/ClientDetail.tsx`

**1. Add State Variables (around line 188)**
```tsx
// BARGAINING IS ON interception state
const [showBargainingDialog, setShowBargainingDialog] = useState(false);
const [selectedBargainPackages, setSelectedBargainPackages] = useState<string[]>([]);
const [clientBargainRates, setClientBargainRates] = useState<Record<string, string>>({});
const [ourBargainRates, setOurBargainRates] = useState<Record<string, string>>({});
const [isSavingBargain, setIsSavingBargain] = useState(false);
const [currentOurBargainedRates, setCurrentOurBargainedRates] = useState("");
const [currentClientBargainedRates, setCurrentClientBargainedRates] = useState("");
```

**2. Add Import for updateBargainingRates**
```tsx
import { 
  updateClient, ClientData, updateClientStatus, logCallAttempt, 
  addPayment, updateClientQuotation, addClientComment, 
  updateFinalQuotation, getSingleClient, updateClientPriority,
  updateBargainingRates  // ADD THIS
} from "@/lib/sheets-api";
```

**3. Add Import for Checkbox component**
```tsx
import { Checkbox } from "@/components/ui/checkbox";
```

**4. Update handleStatusChange to Intercept BARGAINING IS ON**
```tsx
const handleStatusChange = async (newStatus: string) => {
  if (!client?.rowNumber) return;
  
  // INTERCEPT: If moving to QUOTATION SENT...
  const isToQuotationSent = newStatus.toUpperCase().includes('QUOTATION SENT');
  if (isToQuotationSent) {
    setPendingStatus(newStatus);
    setShowQuotationDialog(true);
    return;
  }
  
  // NEW: INTERCEPT: If moving to BARGAINING IS ON, show bargaining dialog
  const isToBargaining = newStatus.toUpperCase().includes('BARGAINING');
  if (isToBargaining) {
    setPendingStatus(newStatus);
    setShowBargainingDialog(true);
    return;
  }
  
  // INTERCEPT: If moving to ADVANCE PENDING...
  const isToAdvancePending = newStatus.toUpperCase().includes('ADVANCE PENDING');
  if (isToAdvancePending) {
    setPendingStatus(newStatus);
    setShowAdvancePendingDialog(true);
    return;
  }
  
  // ... rest of existing code
};
```

**5. Add Handler Function for Saving Bargaining Data**
```tsx
const handleSaveBargaining = async () => {
  if (!client?.rowNumber) return;
  
  if (selectedBargainPackages.length === 0) {
    toast({ title: "Please select at least one package", variant: "destructive" });
    return;
  }

  setIsSavingBargain(true);
  try {
    // Build rate strings
    const ourLines: string[] = [];
    const clientLines: string[] = [];
    selectedBargainPackages.forEach(tier => {
      if (ourBargainRates[tier]) ourLines.push(`${tier}: NPR ${formatNPR(ourBargainRates[tier])}/-`);
      if (clientBargainRates[tier]) clientLines.push(`${tier}: NPR ${formatNPR(clientBargainRates[tier])}/-`);
    });

    // Save bargaining rates to Columns AA and AB
    await updateBargainingRates(client.rowNumber, ourLines.join('\n'), clientLines.join('\n'));
    
    setCurrentOurBargainedRates(ourLines.join('\n'));
    setCurrentClientBargainedRates(clientLines.join('\n'));
    
    // Update status to BARGAINING IS ON
    const statusResult = await updateClientStatus(
      client.rowNumber, 
      pendingStatus, 
      currentStatusLog || client.statusLog || ''
    );
    setCurrentStatusLog(statusResult.statusLog);
    
    // Update global cache
    if (updateClientCache) {
      updateClientCache({
        ...client,
        ourBargainedRates: ourLines.join('\n'),
        clientBargainedRates: clientLines.join('\n'),
        statusLog: statusResult.statusLog
      });
    }
    
    toast({ title: "Bargaining details saved & status updated" });
    setShowBargainingDialog(false);
    
    // Reset form
    setSelectedBargainPackages([]);
    setClientBargainRates({});
    setOurBargainRates({});
    setPendingStatus("");
  } catch (err) {
    console.error('Failed to save bargaining:', err);
    toast({ title: "Failed to save bargaining details", variant: "destructive" });
  } finally {
    setIsSavingBargain(false);
  }
};
```

**6. Add Bargaining Dialog UI (after the BOOKED Payment Dialog at end of file)**
```tsx
{/* BARGAINING IS ON - Bargaining Details Dialog */}
<Dialog open={showBargainingDialog} onOpenChange={(open) => {
  if (!open) {
    setShowBargainingDialog(false);
    setSelectedBargainPackages([]);
    setClientBargainRates({});
    setOurBargainRates({});
    setPendingStatus("");
  }
}}>
  <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-[hsl(220,25%,12%)] border-white/20 text-white">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-amber-500" />
        Bargaining Details
      </DialogTitle>
      <DialogDescription className="text-white/60">
        Which packages is {client?.clientName} bargaining about? Select packages and enter bargaining rates.
      </DialogDescription>
    </DialogHeader>
    
    <div className="space-y-4 py-2">
      {/* Package Selection from Quotation Data */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-white/80">Select Package(s)</Label>
        {parseQuotationData(currentQuotationData || client?.quotationData || '').length > 0 ? (
          <div className="space-y-2">
            {parseQuotationData(currentQuotationData || client?.quotationData || '').map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <Checkbox 
                  id={`pkg-${q.tier}`}
                  checked={selectedBargainPackages.includes(q.tier)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedBargainPackages([...selectedBargainPackages, q.tier]);
                    } else {
                      setSelectedBargainPackages(selectedBargainPackages.filter(t => t !== q.tier));
                      // Clear rates for unchecked package
                      const newClientRates = { ...clientBargainRates };
                      const newOurRates = { ...ourBargainRates };
                      delete newClientRates[q.tier];
                      delete newOurRates[q.tier];
                      setClientBargainRates(newClientRates);
                      setOurBargainRates(newOurRates);
                    }
                  }}
                  className="border-white/30 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <label 
                  htmlFor={`pkg-${q.tier}`}
                  className="text-sm font-medium cursor-pointer px-2 py-1 rounded bg-white/10 text-white"
                >
                  {q.tier}: {q.amount}
                </label>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40">No quotation data available. Please add quotation first.</p>
        )}
      </div>
      
      {/* Rate Inputs for Selected Packages */}
      {selectedBargainPackages.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-white/10">
          <Label className="text-sm font-medium text-white/80">Enter Bargaining Rates</Label>
          {selectedBargainPackages.map((tier) => (
            <div key={tier} className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/10">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                {tier}
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-white/50">Client's Rate</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-white/40">NPR</span>
                    <Input
                      type="number"
                      placeholder="Client's rate"
                      value={clientBargainRates[tier] || ''}
                      onChange={(e) => setClientBargainRates({ ...clientBargainRates, [tier]: e.target.value })}
                      className="h-8 text-sm bg-white/5 border-white/20 text-white placeholder:text-white/30"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-white/50">Our Counter Rate</Label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-white/40">NPR</span>
                    <Input
                      type="number"
                      placeholder="Our new rate"
                      value={ourBargainRates[tier] || ''}
                      onChange={(e) => setOurBargainRates({ ...ourBargainRates, [tier]: e.target.value })}
                      className="h-8 text-sm bg-white/5 border-white/20 text-white placeholder:text-white/30"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    
    <DialogFooter className="gap-2 sm:gap-0">
      <Button 
        variant="outline" 
        onClick={() => {
          setShowBargainingDialog(false);
          setSelectedBargainPackages([]);
          setClientBargainRates({});
          setOurBargainRates({});
          setPendingStatus("");
        }}
        className="border-white/20 text-white hover:bg-white/10"
      >
        Cancel
      </Button>
      <Button 
        onClick={handleSaveBargaining}
        disabled={selectedBargainPackages.length === 0 || isSavingBargain}
        className="bg-amber-600 hover:bg-amber-700 text-white"
      >
        {isSavingBargain ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Saving...
          </>
        ) : (
          <>
            <DollarSign className="w-4 h-4 mr-2" />
            Save & Move to Bargaining
          </>
        )}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### Summary of Changes

| Change | Location |
|--------|----------|
| Add state variables for bargaining dialog | Lines ~188 |
| Import `updateBargainingRates` from sheets-api | Line ~24 |
| Import `Checkbox` component | New import |
| Intercept BARGAINING status in `handleStatusChange` | Lines ~660 |
| Add `handleSaveBargaining` handler function | After line ~788 |
| Add Bargaining Dialog UI | After line ~2057 |

---

### User Experience

1. User opens a client's detail page
2. User clicks status change dropdown
3. User selects "BARGAINING IS ON"
4. **NEW:** A dialog appears asking:
   - Which quotation packages are being negotiated (checkboxes)
   - Client's bargained rate for each selected package
   - Our counter rate for each selected package
5. User fills in the details and clicks "Save & Move to Bargaining"
6. System saves bargaining rates to Columns AA/AB and updates status
7. The "Negotiation in Progress" section now shows the entered data

