

## Activate Freelancers Module in Xito Business Suite

This is a large feature that mirrors the Vendors module pattern but connects to a **separate Google Spreadsheet** ("WTN FREELANCERS") and includes unique logic for Main Job selection, dynamic secondary role checkboxes, and auto-calculated hybrid fields.

### Phase 1: Add Secret for Freelancers Spreadsheet

A new secret `WTN_FREELANCERS_SPREADSHEET_ID` needs to be added with value `1iBznJm3E8pM6aVbXX2-VPUso5C4aHCKUG3by197V_-8`.

### Phase 2: Backend - Edge Function Actions

Add the following actions to `supabase/functions/google-sheets/index.ts`:

| Action | Description |
|--------|-------------|
| `getFreelancers` | Read `'FREELANCERS'!A2:R500` from the freelancers spreadsheet, map columns A-R to data fields |
| `addFreelancer` | Insert a new row at row 2 of `'FREELANCERS'` sheet with all 18 columns. Also mirror to category sheets |
| `updateFreelancer` | Update an existing row by rowNumber. Recalculate hybrid fields and re-mirror to category sheets |
| `deleteFreelancer` | Delete a row from `'FREELANCERS'` sheet and remove from all category sheets |

**Column Mapping (A-R):**
- A: Name, B: Contact No, C: WhatsApp, D: Instagram, E: Facebook, F: City, G: Area, H: Map, I: Pathao Landmark, J: Main Job, K: Photographer, L: Videographer, M: Photo Editor, N: Video Editor, O: Hybrid Shooter, P: Hybrid Editor, Q: Drone Operator, R: FPV Operator

**Save Logic:**
- Main Job selection auto-sets the corresponding column to "YES"
- Additional role checkboxes set their columns to "YES" or "NO"
- Hybrid Shooter (O) = "YES" if K=YES AND L=YES
- Hybrid Editor (P) = "YES" if M=YES AND N=YES

**Category Sheet Mirroring:**
After add/update, mirror the row (A-R) into category sheets based on conditions:
- `PHOTOGRAPHER` sheet if K=YES
- `VIDEOGRAPHER` sheet if L=YES
- `PHOTO EDITOR` sheet if M=YES
- `VIDEO EDITOR` sheet if N=YES
- `HYBRID SHOOTER` sheet if K=YES AND L=YES
- `HYBRID EDITOR` sheet if M=YES AND N=YES
- `DRONE/FPV OPERATOR` sheet if Q=YES OR R=YES

Mirroring uses Name (Column A) as the identifier to find/update/add rows in each category sheet.

### Phase 3: Frontend API Layer

**New file: `src/lib/freelancer-api.ts`**

```text
FreelancerData interface:
  rowNumber, name, contactNo, whatsappNo, instagram, facebook,
  city, area, mapLink, pathaoLandmark, mainJob,
  photographer, videographer, photoEditor, videoEditor,
  hybridShooter, hybridEditor, droneOperator, fpvOperator

Functions:
  getFreelancers() -> FreelancerData[]
  addFreelancer(data) -> void
  updateFreelancer(data) -> void
  deleteFreelancer(rowNumber) -> void
```

All functions call the edge function with the respective action, following the same pattern as `vendor-api.ts`.

### Phase 4: Frontend Components

**New directory: `src/components/freelancers/`**

| Component | Description |
|-----------|-------------|
| `DesktopFreelancers.tsx` | Main page layout (mirrors `DesktopVendors.tsx`): sidebar + header + table + drawers |
| `FreelancerTypeSidebar.tsx` | Left sidebar with role categories: All, Photographer, Videographer, Photo Editor, Video Editor, Hybrid Shooter, Hybrid Editor, Drone/FPV Operator -- with counts |
| `FreelancerTable.tsx` | Table showing Name, Main Job, City, Area, Contact, role badges (YES roles shown as colored badges), and social link icons (Instagram, Facebook, Map) |
| `AddFreelancerDrawer.tsx` | Form with: Name (required), Contact No, WhatsApp, Instagram, Facebook, City dropdown (priority cities), Area, Map, Pathao Landmark, Main Job dropdown, then dynamic secondary checkboxes |
| `FreelancerDetailSheet.tsx` | Side panel for viewing/editing a freelancer with all fields, save and delete actions |
| `index.ts` | Barrel exports |

**Dynamic Form Logic in AddFreelancerDrawer:**
1. User selects Main Job from dropdown (Photographer, Videographer, Video Editor, Photo Editor, Drone/FPV Operator)
2. Below it, a section appears: "Apart from your main profession, do you professionally do the following?"
3. Checkboxes shown for all OTHER roles (excluding the main job selection)
4. If Main Job = "Drone/FPV Operator", show separate Drone Operator and FPV Operator checkboxes
5. On save: Main Job column = YES, checked roles = YES, unchecked = NO, then calculate Hybrid Shooter and Hybrid Editor

### Phase 5: Page and Routing

**New file: `src/pages/Freelancers.tsx`**
- Uses `useDesktopMode()` to show `DesktopFreelancers` or a mobile version (desktop-only for now)

**Update `src/App.tsx`:**
- Import `Freelancers` page
- Change `/freelancers` route from `ComingSoon` to `Freelancers`

**Update `src/lib/suite-modules.ts`:**
- Change freelancers module `status` from `'coming-soon'` to `'active'`

### Phase 6: Filters

The sidebar provides filtering by role type. The header provides:
- **Search by Name** -- text input filtering
- **Filter by City** -- dropdown or inline filter
- **Filter by Main Job** -- dropdown filter

All filtering is done client-side on the fetched data array.

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/google-sheets/index.ts` | Add `getFreelancers`, `addFreelancer`, `updateFreelancer`, `deleteFreelancer` actions + category sheet mirroring |
| `src/lib/freelancer-api.ts` | **New** -- API functions |
| `src/components/freelancers/DesktopFreelancers.tsx` | **New** -- Main desktop layout |
| `src/components/freelancers/FreelancerTypeSidebar.tsx` | **New** -- Role category sidebar |
| `src/components/freelancers/FreelancerTable.tsx` | **New** -- Data table |
| `src/components/freelancers/AddFreelancerDrawer.tsx` | **New** -- Add form with dynamic job logic |
| `src/components/freelancers/FreelancerDetailSheet.tsx` | **New** -- Detail/edit sheet |
| `src/components/freelancers/index.ts` | **New** -- Barrel exports |
| `src/pages/Freelancers.tsx` | **New** -- Page component |
| `src/App.tsx` | Update route from ComingSoon to Freelancers |
| `src/lib/suite-modules.ts` | Change freelancers status to `'active'` |

### Secret Required

`WTN_FREELANCERS_SPREADSHEET_ID` = `1iBznJm3E8pM6aVbXX2-VPUso5C4aHCKUG3by197V_-8`

