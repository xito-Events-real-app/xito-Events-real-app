

# New "Edit" Section in Client Detail Page

## Overview
Add a new "Edit" sidebar section (after Deliverables) in the Client Detail page that combines two collapsible sub-sections: **Files Status** and **Video Edits**. Each shows a compact summary when collapsed and detailed views when expanded.

## Architecture

New component: `src/components/client-detail/EditProductionSection.tsx`

### Props
- `registeredDateTimeAD: string`
- `clientName: string`

### Sub-Section 1: Files Status (Collapsible)

**Collapsed view:**
- Summary cards: Total Photo Size, Total Video Size, Total Files count
- Copy status: "ALL COPIED" (green) or "X files remaining" (red) with names of whose files are missing

**Expanded view:**
- Reuse the same UI pattern from `FileClientDetail.tsx`: event-grouped table with photo/video role separation, background tints (purple for photo, amber for video), device pills, backup status columns
- Read-only, same as the existing Files Client Detail page

**Data loading:** Query `files_management` by `registered_date_time_ad`, same as `FileClientDetail.tsx`

### Sub-Section 2: Video Edits (Collapsible)

**Collapsed view:**
- Summary line: "X Finalized, Y Remaining, Z in Client Review"
- Remaining = total non-finalized, non-deleted rows

**Expanded view:**
- Reuse the EditorView card style from `DesktopVideoEditTracker.tsx`
- Group rows by stage, sort with in-progress stages first (running on top)
- Each card shows: client name, event, edit type, stage label (big colored text), play/pause status, event age stamp, live timer
- "Move to" dropdown for stage transitions
- Stage-specific colors (blue for Edit, purple for Color, rose for Re-Edit)

**Data loading:** Query `video_edit_tracker` by `registered_date_time_ad`, filter `deleted = false`

## Files to Change

1. **Create `src/components/client-detail/EditProductionSection.tsx`**
   - Main component with two `Collapsible` sections
   - Files sub-section: loads from `files_management`, computes photo/video stats, renders event-grouped tables when expanded
   - Video Edits sub-section: loads from `video_edit_tracker`, computes finalized/remaining/client-review counts, renders EditorView-style cards when expanded with stage colors, play/pause indicators, and move-to dropdowns

2. **Update `src/components/client-detail/ClientDetailSidebar.tsx`**
   - Add `'edit'` to `SectionType`
   - Add sidebar item `{ id: 'edit', label: 'Edit', icon: Film }` after `deliverables`

3. **Update `src/components/client-detail/index.ts`**
   - Export `EditProductionSection`

4. **Update `src/pages/ClientDetail.tsx`**
   - Import `EditProductionSection`
   - Add `{activeSection === 'edit' && <EditProductionSection ... />}` block after deliverables
   - Add `'edit'` tab to mobile section tabs
   - Update `SectionType` import

## Technical Details

- Uses `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` from existing UI components
- Video edit status updates use direct Supabase calls (same pattern as `useVideoEditTracker`)
- Reuses `LiveEditTimer`, `EventAgeStamp` utilities -- these will be extracted or imported from the video-edit module
- `STAGES` constant imported from `useVideoEditTracker` for stage metadata
- Stage sorting logic: running progress cards first, then paused progress, then backlog stages

