

## Fix: Show Comments Section for ALL Client Statuses

Currently, the comments section only appears for:
- BOOKED clients (side by side with quotation)
- Early-stage clients (FRESH, UNTOUCHED, etc.)

But it's **missing** for:
- QUOTATION SENT
- BARGAINING
- ADVANCE PENDING
- CANCELLED
- POSTPONED
- BOOKED SOMEWHERE ELSE

---

### Current Behavior

| Status | Quotation Display | Comments |
|--------|------------------|----------|
| FRESH/UNTOUCHED | None | Shows |
| QUOTATION SENT | Shows tiers | **Missing** |
| BARGAINING | Shows negotiation | **Missing** |
| ADVANCE PENDING | Shows tiers | **Missing** |
| BOOKED | Final quotation | Shows |
| CANCELLED/POSTPONED | Reference tiers | **Missing** |

---

### Solution

Add the `InlineComments` component to ALL status displays in a consistent two-column layout:

```
┌─────────────────────────────┬────────────────────────────┐
│  QUOTATION/STATUS INFO      │  COMMENTS                  │
│  (varies by status)         │  (always shown)            │
└─────────────────────────────┴────────────────────────────┘
```

---

### Changes by Status

**BARGAINING (lines 297-367)**:
Wrap in grid, add comments column on right

**QUOTATION SENT / ADVANCE PENDING (lines 371-418)**:
Wrap in grid, add comments column on right

**END STATES - CANCELLED/POSTPONED (lines 422-436)**:
Wrap in grid, add comments column on right

---

### File to Modify

| File | Changes |
|------|---------|
| `src/components/client-detail/QuotationDisplaySection.tsx` | Add `InlineComments` to BARGAINING, QUOTATION SENT, ADVANCE PENDING, and END STATE renders |

---

### Technical Details

Each status section will be updated to:
1. Use `grid grid-cols-1 md:grid-cols-2 gap-3` wrapper (same as BOOKED)
2. Keep quotation/status content in left column
3. Add `InlineComments` component in right column

This ensures a consistent UI where comments are always visible alongside whatever quotation/status info is relevant for that client's stage.

