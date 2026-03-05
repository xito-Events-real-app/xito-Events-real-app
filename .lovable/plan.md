

## Plan: Add "Files" Section to Client Detail Page

### What You Want
A new "Files" sidebar item below "Benzo Keep" in the Client Detail page that shows all file management records for that specific client — inline in the main content area (not full screen). Same functionality as the Files Management module but scoped to this client.

### Changes

#### 1. Add 'files' to SectionType and sidebar items
**File:** `src/components/client-detail/ClientDetailSidebar.tsx`
- Add `'files'` to the `SectionType` union type
- Add a new sidebar item `{ id: 'files', label: 'Files', icon: FolderOpen }` after `keepNotes`
- Import `FolderOpen` from lucide-react

#### 2. Create a new `ClientFilesSection` component
**File:** `src/components/client-detail/ClientFilesSection.tsx` (new)

This component will:
- Accept `registeredDateTimeAD` and `clientName` as props
- Query `files_management` table directly filtered by `registered_date_time_ad` (no month filter needed — show ALL files for this client)
- Query `freelancer_assignments` for this client to get event groupings
- Reuse the same file table rendering pattern from `FullScreenFilesTable` (role badges, backup pills, path builder, cloud upload, notes, reconfirmation)
- Group files by event (like the full table does per assignment row)
- Include `FilePathBuilderDialog` and `CloudUploadDialog` for inline editing
- Use `useStorageDevices` for device list
- Support the same inline update flow (`updateFileRecord` + `scheduleFilesPush`)
- Show stats: total files, files remaining (no 1st backup), total size
- Dark theme styling to match the client detail page

#### 3. Add the section to ClientDetail page
**File:** `src/pages/ClientDetail.tsx`
- Import `ClientFilesSection`
- Add rendering block: `{activeSection === 'files' && <ClientFilesSection registeredDateTimeAD={client.registeredDateTimeAD} clientName={client.clientName} />}`
- Add 'files' tab to mobile section tabs

#### 4. Update barrel export
**File:** `src/components/client-detail/index.ts`
- Export `ClientFilesSection`

### How It Works
- The files are already in `files_management` with `registered_date_time_ad` matching the client
- We query ALL files for this client (across all months/events) in one go
- The table groups by event name + date, with expandable rows showing PHOTO/VIDEO sections
- All edit functionality (path builder, cloud upload, notes, reconfirmation) works identically to the main Files page

