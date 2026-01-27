

## My Accounts Module Enhancements - COMPLETED ✅

All four key improvements have been implemented:

### 1. ✅ Expiry Date Display Enhancement
Changed from "Active", "30d left", "Expired" to:
- "120 days remaining" (green)
- "15 days remaining" (amber for ≤30 days)
- "Expires today" (amber)
- "Expired 5 days ago" (red)

### 2. ✅ Full ID Visibility Fix
Removed `truncate max-w-[200px]` from AccountTable to show full IDs without cropping.

### 3. ✅ Clickable AD to BS Date Conversion
Created `ClickableDateWithBS` component that:
- Shows AD date by default (e.g., "Jan 27, 2026")
- Toggles to BS date on click (e.g., "14 Magh 2082")
- Shows tooltip with the alternate format
- Used in AccountDetailSheet for Purchase Date and Expiry Date

### 4. ✅ Add Account Form
Created `AddAccountDrawer` with all 16 fields (A-P):
- Account Type, ID, Password (required)
- Recovery Account, Registered Number, Who Bought It
- Vendor info: Name, Number, WhatsApp
- Links: Website, Instagram, Facebook
- Subscription: Date of Purchase, Validity, Price
- Expiry Date auto-calculated on backend

### Files Modified/Created

| File | Status |
|------|--------|
| `src/lib/accounts-api.ts` | ✅ Updated expiry labels, added `addAccount()` |
| `src/components/accounts/AccountTable.tsx` | ✅ Fixed ID visibility, updated expiry display |
| `src/components/accounts/AccountCard.tsx` | ✅ Using new expiry labels |
| `src/components/accounts/AccountDetailSheet.tsx` | ✅ Added ClickableDateWithBS |
| `src/components/accounts/ClickableDateWithBS.tsx` | ✅ Created |
| `src/components/accounts/AddAccountDrawer.tsx` | ✅ Created |
| `src/components/accounts/DesktopAccounts.tsx` | ✅ Added "+" button |
| `src/components/accounts/MobileAccounts.tsx` | ✅ Added "+" button |
| `src/components/accounts/index.ts` | ✅ Exported new components |
| `supabase/functions/google-sheets/index.ts` | ✅ Added `addAccount` handler |
