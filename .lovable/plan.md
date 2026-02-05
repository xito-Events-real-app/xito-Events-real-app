

## Fix Benzo Keep Notes Display and Update Branding

### Problems Identified

1. **Data Not Loading**: The `benzoKeepNotes` column (Column AL, index 37) is not being fetched because all data retrieval functions stop at Column AK (index 36)
2. **Wrong Naming**: Labels say "Keep Notes" or "Keep" instead of "Benzo Keep"
3. **Missing Avatar**: Need to replace the sticky note icon with the user's uploaded image as an avatar

---

### Technical Changes

#### 1. Backend - Extend Data Fetching Range (Edge Function)

**File**: `supabase/functions/google-sheets/index.ts`

Update these 4 functions to fetch Column AL:

| Function | Current Range | New Range |
|----------|---------------|-----------|
| `getClients()` | `A2:AK` | `A2:AL` |
| `getSingleClient()` - Tracker | `A2:AK2000` | `A2:AL2000` |
| `getSingleClient()` - Booked | `A2:AK2000` | `A2:AL2000` |
| `getBookedClients()` | `A2:AJ` | `A2:AL` |

Also update mapping logic to include:
```typescript
benzoKeepNotes: row[37] || '',  // Column AL - Benzo Keep notes
```

#### 2. Copy User's Avatar Image to Project

Copy the uploaded image to the project's assets folder for use as the Benzo Keep avatar.

#### 3. Update Sidebar Label

**File**: `src/components/client-detail/ClientDetailSidebar.tsx`

Change label from "Keep Notes" to "Benzo Keep":
```typescript
{ id: 'keepNotes', label: 'Benzo Keep', icon: StickyNote }
```

#### 4. Update Header Button with Avatar

**File**: `src/components/client-detail/ClientHeroSection.tsx`

Replace the StickyNote icon with the user's avatar image:
```tsx
import benzoAvatar from "@/assets/benzo-avatar.jpeg";

// In the button:
<img src={benzoAvatar} alt="Benzo" className="h-5 w-5 rounded-full object-cover" />
<span className="hidden md:inline text-xs font-medium">Benzo Keep</span>
```

#### 5. Update Viewer Title

**File**: `src/components/client-detail/BenzoKeepViewer.tsx`

Change title from "Benzo Keep Notes" to "Benzo Keep"

#### 6. Update Dialog Title

**File**: `src/components/client-detail/BenzoKeepDialog.tsx`

Ensure dialog title says "Benzo Keep"

---

### Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/google-sheets/index.ts` | Extend fetch range from AK to AL in 4 functions, add `benzoKeepNotes` to data mapping |
| `src/assets/benzo-avatar.jpeg` | Copy user's uploaded image |
| `src/components/client-detail/ClientDetailSidebar.tsx` | Change label to "Benzo Keep" |
| `src/components/client-detail/ClientHeroSection.tsx` | Replace icon with avatar image, change text to "Benzo Keep" |
| `src/components/client-detail/BenzoKeepViewer.tsx` | Update title to "Benzo Keep" |
| `src/components/client-detail/BenzoKeepDialog.tsx` | Verify title says "Benzo Keep" |

---

### Root Cause

The notes were being saved correctly to Column AL, but when the client data was refreshed/reloaded, the data fetching functions only read up to Column AK. This meant `benzoKeepNotes` was always empty after a page reload or cache refresh.

