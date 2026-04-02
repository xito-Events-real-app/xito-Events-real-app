

# Move File Status to Files Section (Expanded), Clear Edit Section

## What Changes

1. **Files sidebar section** currently shows `ClientFilesSection` (the full editable files table). Replace it with the **File Status** content from `EditProductionSection` — but always expanded (no collapsible), without the Video Edits part.

2. **Edit sidebar section** becomes empty placeholder ("Coming Soon" or similar).

3. **Color fix**: Photo row tint changes from purple (`bg-purple-500/5`) to a more visible **cyan/sky** color that matches the dark theme better. Video rows keep amber.

## Technical Plan

### 1. Create new `ClientFileStatusSection.tsx`

Extract only the **Files Status** portion from `EditProductionSection.tsx` (lines 180-452) into a new standalone component:
- Same data loading (Supabase `files_management` query)
- Same `fileStats` and `eventGroups` memos
- **Always expanded** — no `Collapsible` wrapper, summary cards + event tables render directly
- Change photo row background from `bg-purple-500/5` to `bg-cyan-500/8` (more visible, theme-matching)
- Change photo-related text from `text-purple-400` to `bg-sky-500/15 text-sky-400` for better contrast
- Keep video as amber (`bg-amber-500/8`)
- Header: "Files Status" with HardDrive icon

### 2. Update `ClientDetail.tsx` (lines 1749-1765)

- **`files` section**: Render `<ClientFileStatusSection>` instead of `<ClientFilesSection>`
- **`edit` section**: Render a simple "Coming Soon" placeholder

### 3. Update `EditProductionSection.tsx`

- Remove the entire Files Status collapsible (lines 311-452)
- Remove the Video Edits collapsible (lines 454-590)
- Render a simple placeholder: "Coming Soon — Edit & Production features will appear here"

### 4. Update `client-detail/index.ts`

- Export `ClientFileStatusSection` from the barrel file

### Files Changed
- **New**: `src/components/client-detail/ClientFileStatusSection.tsx`
- **Edit**: `src/pages/ClientDetail.tsx` — swap components for files/edit sections
- **Edit**: `src/components/client-detail/EditProductionSection.tsx` — replace with placeholder
- **Edit**: `src/components/client-detail/index.ts` — add export

