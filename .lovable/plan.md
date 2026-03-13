

## Fix Build Errors + Investigate Crew Schedule Event Mismatch

### Build Errors (4 files)

The `require()` calls and `NodeJS.Timeout` type are not available in the browser/Vite environment.

**Files to fix:**

1. **`src/components/accounts/AccountCard.tsx`** (line 45) — Replace `require('@/lib/whatsapp-utils')` with a top-level `import { openWhatsApp } from '@/lib/whatsapp-utils'`

2. **`src/components/accounts/AccountDetailSheet.tsx`** (line 55) — Same fix

3. **`src/components/accounts/AccountTable.tsx`** (line 55) — Same fix

4. **`src/components/layout/BottomNav.tsx`** (line 28) — Replace `NodeJS.Timeout` with `ReturnType<typeof setTimeout>`

### Crew Schedule "SHAKTI NEUPANE" Event Mismatch

I queried the database and the data is **correct**:
- `freelancer_assignments`: Chaitra 2 → `PRE+RECEPTION`
- `event_details_cache`: Chaitra 2 → `PRE+RECEPTION`
- `clients_cache`: Chaitra 2 → `PRE+RECEPTION`

"WEDDING BOTH SIDES" is correctly stored as Falgun 28 (not Chaitra 2) in all tables.

**Most likely cause**: Stale browser/session cache. After fixing the build errors and redeploying, a hard refresh should resolve this. If the issue persists after refresh, it would indicate a rendering bug in the Upcoming Events section that needs further investigation.

### Files Changed
- `src/components/accounts/AccountCard.tsx` — Replace `require()` with static import
- `src/components/accounts/AccountDetailSheet.tsx` — Replace `require()` with static import
- `src/components/accounts/AccountTable.tsx` — Replace `require()` with static import
- `src/components/layout/BottomNav.tsx` — Fix `NodeJS.Timeout` type

