

# App Settings Panel

## Overview
Add a Settings gear icon in the top-right header bar of the app (next to the existing buttons in `DesktopSuiteLanding` and `DesktopHeader`). Clicking it opens a slide-over Sheet with tabs for managing three dropdown configurations. All changes persist to the `dropdowns_cache` table in the database.

## Architecture

**No database changes needed** -- the existing `dropdowns_cache` table already stores all these values as JSON arrays keyed by `category`. We just need a UI to edit them.

### New File: `src/components/settings/AppSettingsSheet.tsx`
A Sheet (slide-over panel) with 3 tabs:

**Tab 1: Companies**
- Shows current company names from `dropdowns_cache` where `category = 'companyNames'`
- List of existing companies with delete (X) buttons
- Input + "Add" button to add new companies
- Save writes updated JSON array back to `dropdowns_cache`

**Tab 2: Client Sources**
- Shows current sources from `dropdowns_cache` where `category = 'sources'`
- Default items (INSTAGRAM, FACEBOOK, TIKTOK, WHATSAPP, HANDLER, OLD CLIENT) shown as non-deletable/locked
- Additional custom sources with delete buttons
- Input + "Add" button for custom sources
- **Special behavior note**: The "OLD CLIENT" and "HANDLER" and "WHATSAPP" sub-options are already handled in the form components -- OLD CLIENT triggers client search, HANDLER shows handler list, WHATSAPP shows handler list. This is existing behavior that will now work with the managed data.

**Tab 3: Handlers**
- Shows current handlers from `dropdowns_cache` where `category = 'whatsappOwners'`
- List with delete buttons, input + "Add" button
- These handlers are used across the app for: Who Added, Client Handler, WhatsApp owner, Source "HANDLER" sub-option, handler filters on dashboard

### Modified Files

1. **`src/components/suite/DesktopSuiteLanding.tsx`** -- Add Settings gear icon button in the top-right actions area (before Mobile/Logout buttons). Opens `AppSettingsSheet`.

2. **`src/components/desktop/DesktopHeader.tsx`** -- Add Settings gear icon in the right side actions. Opens `AppSettingsSheet`.

3. **`src/components/desktop/DesktopQuickAdd.tsx`** -- Update the Source dropdown:
   - When "HANDLER" is selected as source, show a sub-dropdown of handlers (same as `whatsappOwners`)
   - When "WHATSAPP" is selected, show handler sub-dropdown (already exists)
   - When "OLD CLIENT" is selected, show client search (already exists)

4. **`src/pages/QuickAdd.tsx`** -- Same source dropdown updates as DesktopQuickAdd for mobile.

5. **`src/components/dashboard/ClientDetailSheet.tsx`** -- Same source dropdown updates.

### Data Flow
- Settings Sheet reads from `dropdowns_cache` via Supabase query
- On save, upserts the `values_json` column for the relevant category
- After save, dispatches a `cache-updated` custom event so `useDropdownData` / `useCachedData` picks up changes immediately
- The `useDropdownData` hook already reads from `dropdowns_cache`, so all forms automatically get updated values

### Source Dropdown Enhancement
Currently sources are: `FACEBOOK, INSTAGRAM, TIKTOK, WHATSAPP, OLD CLIENT, BENZO, NIKIT, BARUN`. The handler names (BENZO, NIKIT, BARUN) are mixed in as sources. With this change:
- Sources become: `INSTAGRAM, FACEBOOK, TIKTOK, WHATSAPP, OLD CLIENT, HANDLER` + any custom ones
- When "HANDLER" is selected as source, a sub-dropdown appears showing all handlers from the handlers list
- The form stores it as `HANDLER - {handlerName}` in the source field (similar to how WHATSAPP currently works)

