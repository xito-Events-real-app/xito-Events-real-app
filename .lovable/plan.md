

## My Accounts Module Enhancements

This plan addresses three key improvements to the My Accounts module:
1. Change expiry display to show "X days remaining" format
2. Make ID fully visible (not truncated)
3. Add clickable dates that show BS (Bikram Sambat) equivalent
4. Create a form to add new accounts to the sheet

---

### Overview of Changes

```text
+-------------------+     +-------------------+     +-------------------+
| UI Components     |     | API Layer         |     | Edge Function     |
| - AccountCard     |     | - accounts-api.ts |     | - google-sheets   |
| - AccountTable    |     | - addAccount()    |     | - addAccount case |
| - AccountDetail   |     |                   |     |                   |
| - AddAccountDrawer|     |                   |     |                   |
+-------------------+     +-------------------+     +-------------------+
```

---

### 1. Expiry Date Display Enhancement

**Current**: Shows "Active", "30d left", "Expired" as badges
**New**: Shows "45 days remaining" or "Expired 3 days ago"

**Files to modify:**
- `src/lib/accounts-api.ts` - Update `getExpiryStatus()` to return human-readable labels
- `src/components/accounts/AccountTable.tsx` - Update expiry column display
- `src/components/accounts/AccountCard.tsx` - Update mobile card expiry badge
- `src/components/accounts/AccountDetailSheet.tsx` - Update detail sheet expiry display

**New label format:**
| Status | Current Label | New Label |
|--------|--------------|-----------|
| Active (>30d) | "Active" | "120 days remaining" |
| Expiring (1-30d) | "15d left" | "15 days remaining" |
| Expired | "Expired" | "Expired 5 days ago" |

---

### 2. Full ID Visibility Fix

**Current**: ID is truncated with `max-w-[200px]` causing cropping
**Fix**: Remove truncation, allow ID to wrap or expand

**Files to modify:**
- `src/components/accounts/AccountTable.tsx` - Line 100: Remove `truncate max-w-[200px]` class

The ID will now display fully without cropping in the desktop table view.

---

### 3. Clickable AD to BS Date Conversion

When users click on any AD date (Date of Purchase, Expiry Date), it will show the corresponding BS date in a tooltip or toggle display.

**Implementation approach:**
- Create a reusable `ClickableDateWithBS` component
- Uses existing `adToBS()` and `formatBSDate()` from `src/lib/nepali-date.ts`
- Clicking toggles between AD and BS display, or shows BS in a tooltip

**Files to modify:**
- Create new: `src/components/accounts/ClickableDateWithBS.tsx`
- Update: `src/components/accounts/AccountTable.tsx` - Use component for expiry dates
- Update: `src/components/accounts/AccountCard.tsx` - Use component for dates
- Update: `src/components/accounts/AccountDetailSheet.tsx` - Use component for all dates

**Component behavior:**
- Default: Shows AD date (e.g., "Jan 27, 2026")
- On click: Toggles to show BS date (e.g., "14 Magh 2082")
- Visual indicator (small calendar icon) to show it's clickable

---

### 4. Add Account Form

Create a drawer form to add new accounts to the WTN ID PASSWORD sheet.

**New files:**
- `src/components/accounts/AddAccountDrawer.tsx` - Form UI component
- Update `src/lib/accounts-api.ts` - Add `addAccount()` function

**Form fields (matching sheet columns A-P):**
| Field | Column | Required |
|-------|--------|----------|
| Account Type | A | Yes |
| ID (email/username) | B | Yes |
| Password | C | Yes |
| Recovery Account | D | No |
| Registered Number | E | No |
| Who Bought It | F | No |
| Vendor | G | No |
| Vendor Number | H | No |
| Vendor WhatsApp | I | No |
| Website | J | No |
| Instagram | K | No |
| Facebook | L | No |
| Date of Purchase | M | No |
| Validity (months) | N | No |
| Expiry Date | O | Auto-calculated |
| Price | P | No |

**Edge function update:**
- Add `addAccount` case to `supabase/functions/google-sheets/index.ts`
- Appends new row to the "WTN ID PASSWORD" sheet

**UI integration:**
- Add "+" button in header of both Desktop and Mobile views
- Opens AddAccountDrawer
- On successful add, refreshes the account list

---

### Technical Details

#### A. Update `getExpiryStatus()` in accounts-api.ts

```typescript
// Updated label format
if (days < 0) {
  const daysAgo = Math.abs(days);
  return { 
    status: 'expired', 
    daysRemaining: days, 
    label: `Expired ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`, 
    colorClass: 'text-red-400' 
  };
} else if (days === 0) {
  return { status: 'expiring', daysRemaining: 0, label: 'Expires today', colorClass: 'text-amber-400' };
} else {
  return { 
    status: days <= 30 ? 'expiring' : 'active', 
    daysRemaining: days, 
    label: `${days} day${days !== 1 ? 's' : ''} remaining`, 
    colorClass: days <= 30 ? 'text-amber-400' : 'text-green-400' 
  };
}
```

#### B. ClickableDateWithBS Component

```typescript
interface Props {
  dateString: string;  // AD date in various formats
  className?: string;
}

// Parses date, converts to BS, shows both on click
// Uses Tooltip from shadcn/ui for clean UX
```

#### C. Edge Function addAccount Handler

```typescript
case 'addAccount':
  if (!data) throw new Error('data is required for addAccount');
  // Use WTN_SECRETS_SPREADSHEET_ID
  const secretsSpreadsheetId = Deno.env.get('WTN_SECRETS_SPREADSHEET_ID') || spreadsheetId;
  result = await addAccount(accessToken, secretsSpreadsheetId, data);
  break;

// addAccount function appends to "WTN ID PASSWORD" sheet
async function addAccount(accessToken, spreadsheetId, data) {
  // Build row array [A through P]
  // POST to sheets API append endpoint
}
```

---

### Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/accounts-api.ts` | Modify | Update expiry labels, add `addAccount()` |
| `src/components/accounts/AccountTable.tsx` | Modify | Fix ID visibility, use new expiry labels, add clickable dates |
| `src/components/accounts/AccountCard.tsx` | Modify | Use new expiry labels, add clickable dates |
| `src/components/accounts/AccountDetailSheet.tsx` | Modify | Use new expiry labels, add clickable dates |
| `src/components/accounts/ClickableDateWithBS.tsx` | Create | Reusable date component with BS conversion |
| `src/components/accounts/AddAccountDrawer.tsx` | Create | Form to add new accounts |
| `src/components/accounts/DesktopAccounts.tsx` | Modify | Add "+" button to header |
| `src/components/accounts/MobileAccounts.tsx` | Modify | Add "+" button to header |
| `src/components/accounts/index.ts` | Modify | Export new components |
| `supabase/functions/google-sheets/index.ts` | Modify | Add `addAccount` handler |

