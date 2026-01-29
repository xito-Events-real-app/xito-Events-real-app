

## Fix: Always Show Comments Section on Client Dashboard

The comments section only appears for clients with specific statuses (like BOOKED). For clients with early statuses (UNTOUCHED, FRESH, etc.), the entire `QuotationDisplaySection` returns `null`, hiding comments.

---

### Root Cause

In `QuotationDisplaySection.tsx`:

```typescript
// Lines 209-211
if (!needsQuotation(status)) {
  return null;  // <-- Comments are inside this component, so they get hidden too!
}
```

The `needsQuotation()` function only returns `true` for:
- QUOTATION SENT
- BARGAINING  
- ADVANCE PENDING
- BOOKED
- CANCELLED
- POSTPONED

For early statuses like UNTOUCHED, FRESH, FOLLOW UP - the entire component (including comments) is hidden.

Additionally, comments are only shown inline for BOOKED clients (lines 279-283).

---

### Solution

When the status doesn't need quotation display, still show the comments section standalone instead of returning `null`.

**Before:**
```typescript
if (!needsQuotation(status)) {
  return null;
}
```

**After:**
```typescript
if (!needsQuotation(status)) {
  // Still show comments section for all clients
  return (
    <div className="mt-3">
      <InlineComments 
        comments={comments} 
        onAddComment={onAddComment} 
        isAddingComment={isAddingComment} 
      />
    </div>
  );
}
```

---

### Visual Result

**For UNTOUCHED/FRESH/FOLLOW UP clients:**
```
┌──────────────────────────────────────────────────┐
│ 💬 COMMENTS (3)                            [+]   │
├──────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────┐   │
│ │ Spoke with bride, wants to meet tomorrow  │   │
│ │                              2 hours ago  │   │
│ └────────────────────────────────────────────┘   │
│ ┌────────────────────────────────────────────┐   │
│ │ Inquired about wedding packages           │   │
│ │                              1 day ago    │   │
│ └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

---

### File to Modify

| File | Changes |
|------|---------|
| `src/components/client-detail/QuotationDisplaySection.tsx` | Show comments section when status doesn't need quotation instead of returning null |

---

### Technical Details

The fix changes the early return at lines 209-211 to return the comments component instead of `null`. This ensures:

1. **BOOKED clients**: See quotation + comments side by side (existing behavior)
2. **BARGAINING/QUOTATION SENT/ADVANCE PENDING**: See quotation details (existing behavior)
3. **UNTOUCHED/FRESH/FOLLOW UP/etc.**: Now see comments section (new behavior)
4. **CANCELLED/POSTPONED**: See quotation reference if available (existing behavior)

