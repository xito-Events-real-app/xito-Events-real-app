

## Password-Protect Status Changes FROM BOOKED + Fix MANDIRA NEUPANE

### Problem
Once a client reaches BOOKED status, their status should be locked. MANDIRA NEUPANE's status was changed to "CANCELLED BY CLIENT" without any safeguard. This must require password `984124` going forward, and affects ALL modules where status can be changed.

### Fix (3 parts)

#### 1. New Component: `BookedStatusPasswordDialog`
**File: `src/components/shared/BookedStatusPasswordDialog.tsx`**

A simple dialog (reusing the same dark theme as `DeleteClientDialog`) with:
- Password input field (password: `984124`)
- "This client is BOOKED. Enter password to change status." message
- Confirm/Cancel buttons
- Shake animation on wrong password, toast error

Props: `open`, `onOpenChange`, `onConfirm()`, `clientName`

#### 2. Add Password Gate to ALL 3 Status Change Handlers

The gate logic (added at the TOP of each handler, before any other intercepts):

```typescript
const isCurrentlyBooked = 
  client._source === 'booked' || 
  (getCurrentStatus(currentStatusLog).toUpperCase().includes('BOOKED') && 
   !getCurrentStatus(currentStatusLog).toUpperCase().includes('SOMEWHERE ELSE'));

if (isCurrentlyBooked) {
  setPendingStatus(newStatus);
  setShowBookedPasswordDialog(true);
  return;
}
```

**Files affected:**

| File | Handler | What changes |
|------|---------|-------------|
| `src/pages/ClientDetail.tsx` | `handleStatusChange` (line 475) | Add gate + dialog state + render dialog |
| `src/components/desktop/DesktopClientRow.tsx` | `handleStatusChange` (line 303) | Add gate + dialog state + render dialog |
| `src/components/dashboard/FreshClientCard.tsx` | `handleStatusClick` (line 478) | Add gate + dialog state + render dialog |

When password is correct, the dialog calls `onConfirm()` which proceeds with the original status change flow (the existing intercept chain for QUOTATION SENT / ADVANCE PENDING / BOOKED / normal).

#### 3. Database Fix — MANDIRA NEUPANE
Update her `status_log` in `clients_cache` to append a POSTPONED entry with current timestamp, making POSTPONED her current status.

### Files Changed
- **New**: `src/components/shared/BookedStatusPasswordDialog.tsx`
- **Edit**: `src/pages/ClientDetail.tsx` — gate + dialog
- **Edit**: `src/components/desktop/DesktopClientRow.tsx` — gate + dialog
- **Edit**: `src/components/dashboard/FreshClientCard.tsx` — gate + dialog
- **Database**: Update MANDIRA NEUPANE's status_log to POSTPONED

